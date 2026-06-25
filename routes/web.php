<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LearnHandsController;

Route::inertia('/', 'welcome')->name('home');
Route::inertia('/hub', 'hub')->name('hub');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [LearnHandsController::class, 'dashboard'])->name('dashboard');

    Route::get('teachers', [LearnHandsController::class, 'teachersIndex'])->name('teachers.index');
    Route::post('teachers', [LearnHandsController::class, 'teachersStore'])->name('teachers.store');
    Route::get('teachers/{username}/edit', [LearnHandsController::class, 'teachersEdit'])->name('teachers.edit');
    Route::put('teachers/{username}', [LearnHandsController::class, 'teachersUpdate'])->name('teachers.update');
    Route::delete('teachers/{username}', [LearnHandsController::class, 'teachersDestroy'])->name('teachers.destroy');

    Route::get('students', [LearnHandsController::class, 'studentsIndex'])->name('students.index');
    Route::delete('students/{username}', [LearnHandsController::class, 'studentsDestroy'])->name('students.destroy');

    Route::get('classes', [LearnHandsController::class, 'classesIndex'])->name('classes.index');
    Route::post('classes', [LearnHandsController::class, 'classesStore'])->name('classes.store');
    Route::delete('classes/{code}', [LearnHandsController::class, 'classesDestroy'])->name('classes.destroy');
});

require __DIR__.'/settings.php';
