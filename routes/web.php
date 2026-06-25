<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LearnHandsController;

Route::inertia('/', 'welcome')->name('home');
Route::inertia('/hub', 'hub')->name('hub');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [LearnHandsController::class, 'dashboard'])->name('dashboard');
    Route::post('dashboard/teachers', [LearnHandsController::class, 'adminCreateTeacher'])->name('dashboard.teachers.create');
    Route::delete('dashboard/teachers/{username}', [LearnHandsController::class, 'adminDeleteTeacher'])->name('dashboard.teachers.delete');
});

require __DIR__.'/settings.php';
