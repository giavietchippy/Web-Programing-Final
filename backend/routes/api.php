<?php

use App\Http\Controllers\LabelController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NotePasswordController;
use Illuminate\Support\Facades\Route;

// Phải dùng cùng bộ middleware với các route cần đăng nhập của Member 1 (profile, password...)
    Route::middleware(['web', 'auth', 'auth.session'])->group(function () {
    Route::post('notes/{note}/password', [NotePasswordController::class, 'enable'])->whereNumber('note');
    Route::post('notes/{note}/unlock', [NotePasswordController::class, 'unlock'])->middleware('throttle:10,1')->whereNumber('note');
    Route::post('notes/{note}/relock', [NotePasswordController::class, 'relock'])->whereNumber('note');
    Route::put('notes/{note}/password', [NotePasswordController::class, 'change'])->whereNumber('note');
    Route::delete('notes/{note}/password', [NotePasswordController::class, 'disable'])->whereNumber('note');

    Route::patch('notes/{note}/pin', [NoteController::class, 'pin'])->whereNumber('note');
    Route::put('notes/{note}/labels', [NoteController::class, 'syncLabels'])->whereNumber('note');
    Route::apiResource('notes', NoteController::class);
    Route::apiResource('labels', LabelController::class)->except('show');
});