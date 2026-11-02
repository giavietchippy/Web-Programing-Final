<?php

use App\Http\Controllers\LabelController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NotePasswordController;
use App\Http\Controllers\NoteShareController;
use Illuminate\Support\Facades\Route;

// Phải dùng cùng bộ middleware với các route cần đăng nhập của Member 1 (profile, password...)
Route::middleware(['web', 'auth', 'auth.session'])->group(function () {
    Route::get('shared-notes', [NoteShareController::class, 'received']);
    Route::post('shared-notes/{note}/seen', [NoteShareController::class, 'markSeen'])->whereNumber('note');
    Route::get('notes/{note}/shares', [NoteShareController::class, 'recipients'])->whereNumber('note');
    Route::post('notes/{note}/shares', [NoteShareController::class, 'store'])->whereNumber('note');
    Route::patch('notes/{note}/shares/{user}', [NoteShareController::class, 'changePermission'])->whereNumber('note')->whereNumber('user');
    Route::delete('notes/{note}/shares/{user}', [NoteShareController::class, 'revoke'])->whereNumber('note')->whereNumber('user');
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
