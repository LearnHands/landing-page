<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. learnhands_users ──────────────────────────────────────────────
        if (!Schema::hasTable('learnhands_users')) {
            Schema::create('learnhands_users', function (Blueprint $table) {
                $table->id();
                $table->string('username', 100)->unique();
                $table->string('display_name', 100)->nullable();
                $table->string('role', 20)->default('student');
                $table->string('password_hash', 255)->nullable();
                $table->string('class_code', 10)->nullable();
                $table->timestamp('last_login_at')->nullable();
                $table->timestamps();
            });
        } else {
            // Agregar columnas si no existen (para bases existentes)
            Schema::table('learnhands_users', function (Blueprint $table) {
                if (!Schema::hasColumn('learnhands_users', 'display_name')) {
                    $table->string('display_name', 100)->nullable()->after('username');
                }
                if (!Schema::hasColumn('learnhands_users', 'class_code')) {
                    $table->string('class_code', 10)->nullable()->after('password_hash');
                }
            });
        }

        // ── 2. learnhands_classes ────────────────────────────────────────────
        if (!Schema::hasTable('learnhands_classes')) {
            Schema::create('learnhands_classes', function (Blueprint $table) {
                $table->id();
                $table->string('teacher_username', 100);
                $table->string('class_code', 10)->unique();
                $table->string('class_name', 150)->nullable();
                $table->timestamps();
            });
        }

        // ── 3. learnhands_student_classes ────────────────────────────────────
        if (!Schema::hasTable('learnhands_student_classes')) {
            Schema::create('learnhands_student_classes', function (Blueprint $table) {
                $table->id();
                $table->string('username', 100);
                $table->string('class_code', 10);
                $table->timestamp('joined_at')->useCurrent();
                $table->unique(['username', 'class_code'], 'uk_student_class');
            });
        }

        // Migrar class_code existentes → learnhands_student_classes
        DB::statement("
            INSERT IGNORE INTO learnhands_student_classes (username, class_code)
            SELECT username, class_code
            FROM learnhands_users
            WHERE class_code IS NOT NULL AND role = 'student'
        ");

        // ── 4. learnhands_metrics ────────────────────────────────────────────
        if (!Schema::hasTable('learnhands_metrics')) {
            Schema::create('learnhands_metrics', function (Blueprint $table) {
                $table->id();
                $table->string('username', 100);
                $table->string('game_name', 50);
                $table->integer('score');
                $table->integer('duration_seconds');
                $table->timestamp('played_at');
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // ── 5. learnhands_ux_metrics ─────────────────────────────────────────
        if (!Schema::hasTable('learnhands_ux_metrics')) {
            Schema::create('learnhands_ux_metrics', function (Blueprint $table) {
                $table->id();
                $table->string('username', 100);
                $table->string('metric_type', 50);
                $table->string('game_name', 50);
                $table->double('metric_value');
                $table->text('details')->nullable();
                $table->timestamp('played_at');
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // ── 6. learnhands_audit_logs ─────────────────────────────────────────
        if (!Schema::hasTable('learnhands_audit_logs')) {
            Schema::create('learnhands_audit_logs', function (Blueprint $table) {
                $table->id();
                $table->string('action', 100);
                $table->text('details')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // ── Datos iniciales ───────────────────────────────────────────────────
        $teacher = DB::table('learnhands_users')->where('username', 'ProfePrueba')->first();
        if (!$teacher) {
            DB::table('learnhands_users')->insert([
                'username'      => 'ProfePrueba',
                'display_name'  => 'Profe Prueba',
                'role'          => 'teacher',
                'password_hash' => Hash::make('secreto123'),
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        $classes = DB::table('learnhands_classes')->where('teacher_username', 'ProfePrueba')->count();
        if ($classes === 0) {
            $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            $code  = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $chars[random_int(0, strlen($chars) - 1)];
            }
            DB::table('learnhands_classes')->insert([
                'teacher_username' => 'ProfePrueba',
                'class_code'       => $code,
                'class_name'       => 'Clase Principal',
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }

        DB::table('learnhands_audit_logs')->insert([
            'action'     => 'SYSTEM_STARTUP',
            'details'    => 'Migración Laravel ejecutada. Tablas verificadas.',
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('learnhands_audit_logs');
        Schema::dropIfExists('learnhands_ux_metrics');
        Schema::dropIfExists('learnhands_metrics');
        Schema::dropIfExists('learnhands_student_classes');
        Schema::dropIfExists('learnhands_classes');
        Schema::dropIfExists('learnhands_users');
    }
};
