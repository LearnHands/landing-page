<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class LearnHandsController extends Controller
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Genera un código de clase alfanumérico de 6 caracteres (sin O, 0, I, 1).
     */
    private function generateClassCode(): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $code;
    }

    /**
     * Limpia texto: elimina tildes, ñ y caracteres especiales.
     * Solo deja letras a-z A-Z, números y espacios.
     */
    private function sanitizeText(string $text): string
    {
        // Eliminar tildes/diacríticos usando transliteration
        $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
        // Eliminar todo lo que no sea alfanumérico o espacio
        $text = preg_replace('/[^a-zA-Z0-9\s]/', '', $text);
        // Colapsar espacios múltiples
        $text = preg_replace('/\s+/', ' ', $text);
        return trim($text);
    }

    /**
     * Valida si un string es una cédula ecuatoriana válida (10 dígitos).
     */
    private function validateCedula(string $cedula): bool
    {
        if (!preg_match('/^\d{10}$/', $cedula)) {
            return false;
        }
        $digits = array_map('intval', str_split($cedula));
        $province = $digits[0] * 10 + $digits[1];
        if ($province < 1 || $province > 24) {
            return false;
        }
        $coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $val = $digits[$i] * $coefficients[$i];
            if ($val >= 10) $val -= 9;
            $sum += $val;
        }
        $verifier = (10 - ($sum % 10)) % 10;
        return $verifier === $digits[9];
    }

    /**
     * Registra una entrada en el log de auditoría.
     */
    private function logAudit(string $action, string $details, ?string $ip = '127.0.0.1'): void
    {
        try {
            DB::table('learnhands_audit_logs')->insert([
                'action'     => $action,
                'details'    => $details,
                'ip_address' => $ip ?? '127.0.0.1',
                'created_at' => now(),
            ]);
        } catch (\Exception $e) {
            // No bloquear el flujo si el log falla
        }
    }

    /**
     * Agrega un alumno a una clase (many-to-many) y actualiza la clase activa.
     */
    private function addStudentToClass(string $username, string $classCode): void
    {
        // INSERT IGNORE equivale a insertOrIgnore en Laravel
        DB::table('learnhands_student_classes')->insertOrIgnore([
            'username'   => $username,
            'class_code' => $classCode,
            'joined_at'  => now(),
        ]);
        DB::table('learnhands_users')
            ->where('username', $username)
            ->update(['class_code' => $classCode, 'updated_at' => now()]);
    }

    // ── Healthcheck ───────────────────────────────────────────────────────────

    public function health(): JsonResponse
    {
        try {
            DB::select('SELECT 1');
            return response()->json([
                'status'    => 'OK',
                'message'   => 'Servidor y base de datos funcionando correctamente.',
                'database'  => 'CONNECTED',
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'    => 'ERROR',
                'message'   => 'El servidor está activo pero la base de datos no responde.',
                'database'  => 'DISCONNECTED',
                'error'     => $e->getMessage(),
                'timestamp' => now(),
            ], 500);
        }
    }

    // ── Verificación de Cédula ────────────────────────────────────────────────

    public function checkCedula(string $cedula): JsonResponse
    {
        $cedula = trim($cedula);

        if (!$this->validateCedula($cedula)) {
            return response()->json(['valid' => false, 'error' => 'Cédula inválida. Debe tener 10 dígitos.'], 422);
        }

        $user = DB::table('learnhands_users')->where('username', $cedula)->first();

        if (!$user) {
            return response()->json(['exists' => false, 'valid' => true]);
        }

        $classes = DB::table('learnhands_student_classes as sc')
            ->leftJoin('learnhands_classes as c', 'sc.class_code', '=', 'c.class_code')
            ->where('sc.username', $cedula)
            ->select('sc.class_code', 'c.class_name')
            ->get();

        return response()->json([
            'exists'       => true,
            'valid'        => true,
            'display_name' => $user->display_name,
            'active_class' => $user->class_code,
            'classes'      => $classes,
        ]);
    }

    // ── Registro / Login de Alumnos ───────────────────────────────────────────

    public function register(Request $request): JsonResponse
    {
        $ip = $request->ip();
        $cedula    = $request->input('cedula');
        $username  = $request->input('username');
        $classCode = $request->input('class_code');

        // ── Modo legacy (nombre sin cédula) ──────────────────────────────────
        if (!$cedula && $username) {
            $usernameClean = $this->sanitizeText(trim($username));
            if (!$usernameClean || strlen($usernameClean) < 2) {
                return response()->json(['error' => 'Nombre inválido.'], 422);
            }

            $existing = DB::table('learnhands_users')->where('username', $usernameClean)->first();
            if ($existing) {
                DB::table('learnhands_users')->where('username', $usernameClean)
                    ->update(['last_login_at' => now(), 'updated_at' => now()]);
                return response()->json([
                    'success'      => true,
                    'status'       => 'existing',
                    'username'     => $usernameClean,
                    'display_name' => $existing->display_name ?? $usernameClean,
                    'role'         => $existing->role,
                    'class_code'   => $existing->class_code,
                    'classes'      => [],
                ]);
            }

            $classCodeClean = $classCode ? strtoupper(trim($classCode)) : null;
            DB::table('learnhands_users')->insert([
                'username'      => $usernameClean,
                'display_name'  => $usernameClean,
                'role'          => 'student',
                'class_code'    => $classCodeClean,
                'last_login_at' => now(),
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
            if ($classCodeClean) $this->addStudentToClass($usernameClean, $classCodeClean);
            $this->logAudit('STUDENT_REGISTERED_LEGACY', "Alumno legacy: '{$usernameClean}'", $ip);

            return response()->json([
                'success'      => true,
                'status'       => 'created',
                'username'     => $usernameClean,
                'display_name' => $usernameClean,
                'role'         => 'student',
                'class_code'   => $classCodeClean,
                'classes'      => $classCodeClean ? [['class_code' => $classCodeClean]] : [],
            ], 201);
        }

        // ── Modo nuevo: cédula ────────────────────────────────────────────────
        $cedulaClean = trim($cedula ?? '');
        if (!$this->validateCedula($cedulaClean)) {
            return response()->json(['error' => 'Cédula inválida. Debe tener 10 dígitos numéricos válidos.'], 422);
        }

        $displayName = $request->input('display_name', '');
        $displayNameClean = $displayName ? $this->sanitizeText(trim($displayName)) : '';
        $classCodeClean = $classCode ? strtoupper(trim($classCode)) : null;

        // Validar class_code si se proporcionó
        if ($classCodeClean) {
            $classExists = DB::table('learnhands_classes')->where('class_code', $classCodeClean)->exists();
            if (!$classExists) {
                return response()->json(['error' => 'Código de clase inválido. Verifica el código con tu profesor.'], 404);
            }
        }

        $existing = DB::table('learnhands_users')->where('username', $cedulaClean)->first();

        if ($existing) {
            // ── Alumno existente → LOGIN ──────────────────────────────────────
            DB::table('learnhands_users')->where('username', $cedulaClean)
                ->update(['last_login_at' => now(), 'updated_at' => now()]);

            if ($classCodeClean) $this->addStudentToClass($cedulaClean, $classCodeClean);

            $classes = DB::table('learnhands_student_classes as sc')
                ->leftJoin('learnhands_classes as c', 'sc.class_code', '=', 'c.class_code')
                ->where('sc.username', $cedulaClean)
                ->select('sc.class_code', 'c.class_name')
                ->get();

            $this->logAudit('STUDENT_LOGIN', "Alumno '{$existing->display_name}' ({$cedulaClean}) ingresó.", $ip);

            return response()->json([
                'success'      => true,
                'status'       => 'existing',
                'username'     => $cedulaClean,
                'display_name' => $existing->display_name ?? $cedulaClean,
                'role'         => $existing->role,
                'class_code'   => $existing->class_code,
                'classes'      => $classes,
            ]);
        }

        // ── Nuevo alumno → REGISTRO ───────────────────────────────────────────
        if (!$displayNameClean || strlen($displayNameClean) < 2) {
            return response()->json(['error' => 'El nombre completo es requerido para el registro.'], 422);
        }

        $passwordHash = Hash::make($cedulaClean);

        DB::table('learnhands_users')->insert([
            'username'      => $cedulaClean,
            'display_name'  => $displayNameClean,
            'role'          => 'student',
            'password_hash' => $passwordHash,
            'class_code'    => $classCodeClean,
            'last_login_at' => now(),
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        if ($classCodeClean) $this->addStudentToClass($cedulaClean, $classCodeClean);

        $classTag = $classCodeClean ? " clase: {$classCodeClean}" : '';
        $this->logAudit('STUDENT_REGISTERED', "Nuevo alumno: '{$displayNameClean}' ({$cedulaClean}){$classTag}", $ip);

        return response()->json([
            'success'      => true,
            'status'       => 'created',
            'username'     => $cedulaClean,
            'display_name' => $displayNameClean,
            'role'         => 'student',
            'class_code'   => $classCodeClean,
            'classes'      => $classCodeClean ? [['class_code' => $classCodeClean, 'class_name' => null]] : [],
        ], 201);
    }

    // ── Login del Profesor ────────────────────────────────────────────────────

    public function login(Request $request): JsonResponse
    {
        $ip = $request->ip();
        $usernameClean = trim($request->input('username', ''));
        $password      = $request->input('password', '');
        $role          = $request->input('role', 'teacher');

        if (!$usernameClean || !$password) {
            return response()->json(['success' => false, 'message' => 'Credenciales incompletas.'], 422);
        }

        $user = DB::table('learnhands_users')
            ->where('username', $usernameClean)
            ->where('role', $role)
            ->first();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuario no encontrado.'], 401);
        }

        $isMatch = $user->password_hash && Hash::check($password, $user->password_hash);
        if (!$isMatch) {
            $this->logAudit('LOGIN_FAILED', "Intento fallido para '{$usernameClean}'", $ip);
            return response()->json(['success' => false, 'message' => 'Contraseña incorrecta.'], 401);
        }

        DB::table('learnhands_users')->where('username', $usernameClean)
            ->update(['last_login_at' => now(), 'updated_at' => now()]);
        $this->logAudit('TEACHER_LOGIN', "Profesora '{$usernameClean}' inició sesión.", $ip);

        return response()->json([
            'success'      => true,
            'message'      => 'Autenticación exitosa.',
            'username'     => $usernameClean,
            'display_name' => $user->display_name ?? $usernameClean,
            'role'         => $user->role,
        ]);
    }

    // ── Clases del Alumno ─────────────────────────────────────────────────────

    public function studentClasses(Request $request): JsonResponse
    {
        $username = $request->query('username');
        if (!$username) {
            return response()->json(['error' => 'username requerido.'], 422);
        }

        $classes = DB::table('learnhands_student_classes as sc')
            ->leftJoin('learnhands_classes as c', 'sc.class_code', '=', 'c.class_code')
            ->where('sc.username', $username)
            ->select('sc.class_code', 'c.class_name', 'c.teacher_username', 'sc.joined_at')
            ->orderByDesc('sc.joined_at')
            ->get();

        return response()->json($classes);
    }

    public function joinClass(Request $request): JsonResponse
    {
        $ip        = $request->ip();
        $username  = $request->input('username');
        $classCode = $request->input('class_code');

        if (!$username || !$classCode) {
            return response()->json(['error' => 'username y class_code son requeridos.'], 422);
        }

        $codeClean = strtoupper(trim($classCode));
        $class = DB::table('learnhands_classes')->where('class_code', $codeClean)->first();
        if (!$class) {
            return response()->json(['error' => 'Código de clase inválido.'], 404);
        }

        $this->addStudentToClass($username, $codeClean);
        $this->logAudit('STUDENT_JOINED_CLASS', "'{$username}' se unió a la clase {$codeClean}", $ip);

        return response()->json([
            'success'    => true,
            'class_code' => $codeClean,
            'class_name' => $class->class_name,
            'teacher'    => $class->teacher_username,
        ]);
    }

    public function updateActiveClass(Request $request): JsonResponse
    {
        $username  = $request->input('username');
        $classCode = $request->input('class_code');

        if (!$username) {
            return response()->json(['error' => 'username requerido.'], 422);
        }

        $codeClean = $classCode ? strtoupper(trim($classCode)) : null;
        DB::table('learnhands_users')
            ->where('username', $username)
            ->update(['class_code' => $codeClean, 'updated_at' => now()]);

        return response()->json(['success' => true, 'active_class' => $codeClean]);
    }

    // ── Métricas ──────────────────────────────────────────────────────────────

    public function saveMetrics(Request $request): JsonResponse
    {
        $ip = $request->ip();
        $data = $request->all();
        $metricsList = is_array($data) && isset($data[0]) ? $data : [$data];

        if (empty($metricsList)) {
            return response()->json(['error' => 'La lista de métricas está vacía.'], 400);
        }

        try {
            DB::beginTransaction();
            foreach ($metricsList as $item) {
                if (!isset($item['username'], $item['game_name'], $item['score'], $item['duration_seconds'], $item['played_at'])) {
                    throw new \Exception('Formato de métrica inválido.');
                }
                DB::table('learnhands_metrics')->insert([
                    'username'         => $item['username'],
                    'game_name'        => $item['game_name'],
                    'score'            => $item['score'],
                    'duration_seconds' => $item['duration_seconds'],
                    'played_at'        => date('Y-m-d H:i:s', strtotime($item['played_at'])),
                    'created_at'       => now(),
                ]);
            }
            DB::commit();
            $this->logAudit('METRICS_SYNC', count($metricsList) . ' métricas sincronizadas.', $ip);
            return response()->json([
                'success' => true,
                'message' => count($metricsList) . ' métricas guardadas correctamente.',
                'count'   => count($metricsList),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al guardar las métricas.', 'details' => $e->getMessage()], 500);
        }
    }

    public function saveUxMetrics(Request $request): JsonResponse
    {
        $data = $request->all();
        $metricsList = is_array($data) && isset($data[0]) ? $data : [$data];

        if (empty($metricsList)) {
            return response()->json(['error' => 'Lista vacía.'], 400);
        }

        try {
            DB::beginTransaction();
            foreach ($metricsList as $item) {
                if (!isset($item['username'], $item['metric_type'], $item['game_name'], $item['metric_value'], $item['played_at'])) {
                    throw new \Exception('Formato UX inválido.');
                }
                $details = isset($item['details'])
                    ? (is_array($item['details']) ? json_encode($item['details']) : $item['details'])
                    : null;
                DB::table('learnhands_ux_metrics')->insert([
                    'username'     => $item['username'],
                    'metric_type'  => $item['metric_type'],
                    'game_name'    => $item['game_name'],
                    'metric_value' => $item['metric_value'],
                    'details'      => $details,
                    'played_at'    => date('Y-m-d H:i:s', strtotime($item['played_at'])),
                    'created_at'   => now(),
                ]);
            }
            DB::commit();
            return response()->json(['success' => true, 'count' => count($metricsList)]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al guardar métricas UX.', 'details' => $e->getMessage()], 500);
        }
    }

    // ── Endpoints del Profesor ────────────────────────────────────────────────

    public function getStudents(Request $request): JsonResponse
    {
        $ip        = $request->ip();
        $classCode = $request->query('class_code');

        if ($classCode) {
            $rows = DB::table('learnhands_users as u')
                ->join('learnhands_student_classes as sc', function ($join) use ($classCode) {
                    $join->on('u.username', '=', 'sc.username')
                         ->where('sc.class_code', strtoupper($classCode));
                })
                ->leftJoin('learnhands_metrics as m', 'u.username', '=', 'm.username')
                ->where('u.role', 'student')
                ->groupBy('u.username', 'u.display_name', 'u.last_login_at', 'u.created_at', 'u.class_code')
                ->selectRaw('u.username, COALESCE(u.display_name, u.username) as display_name, COALESCE(SUM(m.score), 0) as total_score, MAX(m.played_at) as last_played_at, u.last_login_at, u.created_at as registered_at, u.class_code')
                ->orderByDesc('total_score')
                ->get();
        } else {
            $rows = DB::table('learnhands_users as u')
                ->leftJoin('learnhands_metrics as m', 'u.username', '=', 'm.username')
                ->where('u.role', 'student')
                ->groupBy('u.username', 'u.display_name', 'u.last_login_at', 'u.created_at', 'u.class_code')
                ->selectRaw('u.username, COALESCE(u.display_name, u.username) as display_name, COALESCE(SUM(m.score), 0) as total_score, MAX(m.played_at) as last_played_at, u.last_login_at, u.created_at as registered_at, u.class_code')
                ->orderByDesc('total_score')
                ->get();
        }

        $this->logAudit('TEACHER_DASHBOARD_VIEW', 'Profesora consultó alumnos.', $ip);
        return response()->json($rows);
    }

    public function getClassStudents(string $code): JsonResponse
    {
        $code = strtoupper($code);
        $rows = DB::table('learnhands_student_classes as sc')
            ->join('learnhands_users as u', 'sc.username', '=', 'u.username')
            ->leftJoin('learnhands_metrics as m', 'u.username', '=', 'm.username')
            ->where('sc.class_code', $code)
            ->groupBy('u.username', 'u.display_name', 'u.last_login_at', 'sc.joined_at')
            ->selectRaw('u.username, COALESCE(u.display_name, u.username) as display_name, COALESCE(SUM(m.score), 0) as total_score, MAX(m.played_at) as last_played_at, u.last_login_at, sc.joined_at')
            ->orderByDesc('total_score')
            ->get();

        return response()->json($rows);
    }

    public function getTeacherClasses(Request $request): JsonResponse
    {
        $teacherName = $request->query('teacher', 'ProfePrueba');

        $rows = DB::table('learnhands_classes')
            ->where('teacher_username', $teacherName)
            ->orderByDesc('created_at')
            ->select('id', 'class_code', 'class_name', 'created_at')
            ->get();

        $classes = $rows->map(function ($cls) {
            $count = DB::table('learnhands_student_classes')
                ->where('class_code', $cls->class_code)
                ->count();
            return array_merge((array) $cls, ['student_count' => $count]);
        });

        return response()->json($classes);
    }

    public function createClass(Request $request): JsonResponse
    {
        $ip          = $request->ip();
        $teacherName = $request->input('teacher', 'ProfePrueba');
        $className   = $request->input('class_name', '');

        if (!trim($className)) {
            return response()->json(['error' => 'El nombre de la clase es requerido.'], 422);
        }

        $newCode = null;
        $attempts = 0;
        do {
            $newCode = $this->generateClassCode();
            $exists = DB::table('learnhands_classes')->where('class_code', $newCode)->exists();
            if (!$exists) break;
        } while (++$attempts < 10);

        DB::table('learnhands_classes')->insert([
            'teacher_username' => $teacherName,
            'class_code'       => $newCode,
            'class_name'       => trim($className),
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
        $this->logAudit('CLASS_CREATED', "Clase \"{$className}\" ({$newCode}) creada por {$teacherName}", $ip);

        return response()->json([
            'success'    => true,
            'class_code' => $newCode,
            'class_name' => trim($className),
        ], 201);
    }

    public function deleteClass(string $code, Request $request): JsonResponse
    {
        $ip          = $request->ip();
        $teacherName = $request->query('teacher', 'ProfePrueba');
        $code        = strtoupper($code);

        $cls = DB::table('learnhands_classes')
            ->where('class_code', $code)
            ->where('teacher_username', $teacherName)
            ->first();

        if (!$cls) {
            return response()->json(['error' => 'Clase no encontrada.'], 404);
        }

        DB::table('learnhands_student_classes')->where('class_code', $code)->delete();
        DB::table('learnhands_users')->where('class_code', $code)->update(['class_code' => null]);
        DB::table('learnhands_classes')->where('class_code', $code)->delete();
        $this->logAudit('CLASS_DELETED', "Clase \"{$cls->class_name}\" ({$code}) eliminada", $ip);

        return response()->json(['success' => true, 'message' => "Clase {$code} eliminada."]);
    }

    public function getClassInfo(Request $request): JsonResponse
    {
        $teacherName = $request->query('teacher', 'ProfePrueba');
        $code        = $request->query('code');

        if ($code) {
            $cls = DB::table('learnhands_classes')
                ->where('class_code', strtoupper($code))
                ->where('teacher_username', $teacherName)
                ->first();
        } else {
            $cls = DB::table('learnhands_classes')
                ->where('teacher_username', $teacherName)
                ->orderBy('created_at')
                ->first();
        }

        if (!$cls) {
            return response()->json(['error' => 'No se encontró una clase.'], 404);
        }

        $count = DB::table('learnhands_student_classes')
            ->where('class_code', $cls->class_code)
            ->count();

        return response()->json([
            'class_code'       => $cls->class_code,
            'class_name'       => $cls->class_name,
            'teacher_username' => $teacherName,
            'student_count'    => $count,
            'created_at'       => $cls->created_at,
        ]);
    }

    public function regenerateClassCode(Request $request): JsonResponse
    {
        $ip          = $request->ip();
        $teacherName = $request->input('teacher', 'ProfePrueba');
        $classCode   = $request->input('class_code');

        if (!$classCode) {
            return response()->json(['error' => 'class_code requerido.'], 422);
        }

        $oldCode = strtoupper($classCode);
        $newCode = $this->generateClassCode();

        DB::table('learnhands_student_classes')->where('class_code', $oldCode)->update(['class_code' => $newCode]);
        DB::table('learnhands_users')->where('class_code', $oldCode)->update(['class_code' => $newCode]);
        DB::table('learnhands_classes')
            ->where('class_code', $oldCode)
            ->where('teacher_username', $teacherName)
            ->update(['class_code' => $newCode, 'updated_at' => now()]);

        $this->logAudit('CLASS_CODE_REGENERATED', "{$oldCode} -> {$newCode}", $ip);

        return response()->json(['success' => true, 'class_code' => $newCode]);
    }

    public function validateClassCode(string $code): JsonResponse
    {
        $code = strtoupper(trim($code));
        $cls = DB::table('learnhands_classes')->where('class_code', $code)->first();

        if (!$cls) {
            return response()->json(['valid' => false, 'message' => 'Código de clase no encontrado.'], 404);
        }

        return response()->json([
            'valid'       => true,
            'class_code'  => $cls->class_code,
            'class_name'  => $cls->class_name,
            'teacher'     => $cls->teacher_username,
        ]);
    }

    public function getMetrics(Request $request): JsonResponse
    {
        $ip = $request->ip();
        $rows = DB::table('learnhands_metrics')->orderByDesc('played_at')->get();
        $this->logAudit('TEACHER_METRICS_VIEW', 'Profesora consultó métricas.', $ip);
        return response()->json($rows);
    }

    // ── Dashboard Administrativo (protegido por auth de Laravel) ─────────────

    public function dashboard(): InertiaResponse
    {
        $teachers = DB::table('learnhands_users')
            ->where('role', 'teacher')
            ->orderBy('created_at')
            ->select('username', 'display_name', 'last_login_at', 'created_at')
            ->get();

        $students = DB::table('learnhands_users as u')
            ->leftJoin('learnhands_metrics as m', 'u.username', '=', 'm.username')
            ->where('u.role', 'student')
            ->groupBy('u.username', 'u.display_name', 'u.class_code', 'u.last_login_at', 'u.created_at')
            ->selectRaw('u.username, COALESCE(u.display_name, u.username) as display_name, u.class_code, u.last_login_at, u.created_at, COALESCE(SUM(m.score), 0) as total_score, COUNT(m.id) as sessions')
            ->orderByDesc('total_score')
            ->get();

        $metrics = DB::table('learnhands_metrics as m')
            ->join('learnhands_users as u', 'm.username', '=', 'u.username')
            ->selectRaw('m.username, COALESCE(u.display_name, m.username) as display_name, m.game_name, m.score, m.duration_seconds, m.played_at')
            ->orderByDesc('m.played_at')
            ->limit(100)
            ->get();

        $byGame = DB::table('learnhands_metrics')
            ->selectRaw('game_name, COUNT(*) as sessions, AVG(score) as avg_score, MAX(score) as max_score, AVG(duration_seconds) as avg_duration')
            ->groupBy('game_name')
            ->orderByDesc('sessions')
            ->get();

        return Inertia::render('dashboard', [
            'teachers' => $teachers,
            'students' => $students,
            'metrics'  => $metrics,
            'byGame'   => $byGame,
        ]);
    }

    public function adminCreateTeacher(Request $request): RedirectResponse
    {
        $username    = trim($request->input('username', ''));
        $displayName = trim($request->input('display_name', ''));
        $password    = trim($request->input('password', ''));

        if (!$username || !$password) {
            return redirect()->route('dashboard')->with('error', 'Usuario y contraseña son requeridos.');
        }

        $exists = DB::table('learnhands_users')->where('username', $username)->exists();
        if ($exists) {
            return redirect()->route('dashboard')->with('error', "El usuario '{$username}' ya existe.");
        }

        DB::table('learnhands_users')->insert([
            'username'      => $username,
            'display_name'  => $displayName ?: $username,
            'role'          => 'teacher',
            'password_hash' => Hash::make($password),
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $classCode = $this->generateClassCode();
        DB::table('learnhands_classes')->insert([
            'teacher_username' => $username,
            'class_code'       => $classCode,
            'class_name'       => 'Clase Principal',
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $this->logAudit('ADMIN_TEACHER_CREATED', "Profesor '{$username}' creado.", $request->ip());

        return redirect()->route('dashboard')->with('success', "Profesor '{$username}' registrado. Código de clase: {$classCode}.");
    }

    public function adminDeleteTeacher(string $username, Request $request): RedirectResponse
    {
        DB::table('learnhands_users')->where('username', $username)->where('role', 'teacher')->delete();
        $this->logAudit('ADMIN_TEACHER_DELETED', "Profesor '{$username}' eliminado.", $request->ip());

        return redirect()->route('dashboard')->with('success', "Profesor '{$username}' eliminado.");
    }
}
