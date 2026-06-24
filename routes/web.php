<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LearnHandsController;

Route::inertia('/', 'welcome')->name('home');
Route::inertia('/hub', 'hub')->name('hub');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

// ── Panel Administrativo ──────────────────────────────────────────────────────
Route::get('/admin', [LearnHandsController::class, 'adminPanel'])->name('admin');
Route::post('/admin/login', [LearnHandsController::class, 'adminLogin'])->name('admin.login');
Route::post('/admin/logout', [LearnHandsController::class, 'adminLogout'])->name('admin.logout');
Route::post('/admin/teachers', [LearnHandsController::class, 'adminCreateTeacher'])->name('admin.teachers.create');
Route::delete('/admin/teachers/{username}', [LearnHandsController::class, 'adminDeleteTeacher'])->name('admin.teachers.delete');

require __DIR__.'/settings.php';
