<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LearnHandsController;

// ── LearnHands API ────────────────────────────────────────────────────────────

// Health
Route::get('/health', [LearnHandsController::class, 'health']);

// Auth
Route::get('/auth/check-cedula/{cedula}', [LearnHandsController::class, 'checkCedula']);
Route::post('/auth/register', [LearnHandsController::class, 'register']);
Route::post('/auth/login', [LearnHandsController::class, 'login']);

// Student class management
Route::get('/student/classes', [LearnHandsController::class, 'studentClasses']);
Route::post('/student/join-class', [LearnHandsController::class, 'joinClass']);
Route::put('/student/active-class', [LearnHandsController::class, 'updateActiveClass']);

// Metrics
Route::post('/metrics', [LearnHandsController::class, 'saveMetrics']);
Route::post('/ux-metrics', [LearnHandsController::class, 'saveUxMetrics']);

// Teacher endpoints
Route::get('/teacher/students', [LearnHandsController::class, 'getStudents']);
Route::get('/teacher/classes', [LearnHandsController::class, 'getTeacherClasses']);
Route::post('/teacher/classes', [LearnHandsController::class, 'createClass']);
Route::delete('/teacher/classes/{code}', [LearnHandsController::class, 'deleteClass']);
Route::get('/teacher/classes/{code}/students', [LearnHandsController::class, 'getClassStudents']);
Route::get('/teacher/class-info', [LearnHandsController::class, 'getClassInfo']);
Route::post('/teacher/regenerate-class-code', [LearnHandsController::class, 'regenerateClassCode']);
Route::get('/teacher/metrics', [LearnHandsController::class, 'getMetrics']);

// Public class validation
Route::get('/classes/validate/{code}', [LearnHandsController::class, 'validateClassCode']);
