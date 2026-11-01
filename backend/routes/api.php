<?php

use App\Http\Controllers\LabelController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NotePasswordController;
use Illuminate\Support\Facades\Route;

// Phải dùng cùng bộ middleware với các route cần đăng nhập của Member 1 (profile, password...)
Route::middleware(['web', 'auth', 'auth.session'])->group(function () {
    Route::patch('notes/{note}/pin', [NoteController::class, 'pin'])->whereNumber('note');
    Route::put('notes/{note}/labels', [NoteController::class, 'syncLabels'])->whereNumber('note');
    Route::apiResource('notes', NoteController::class);
    Route::apiResource('labels', LabelController::class)->except('show');
});