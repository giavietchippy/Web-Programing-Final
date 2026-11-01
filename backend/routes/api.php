<?php

use App\Http\Controllers\LabelController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NotePasswordController;
use Illuminate\Support\Facades\Route;

// TODO: khi Member 1 merge Sanctum, bọc nhóm route này bằng middleware 'auth:sanctum'
Route::patch('notes/{note}/pin', [NoteController::class, 'pin'])->whereNumber('note');
Route::put('notes/{note}/labels', [NoteController::class, 'syncLabels'])->whereNumber('note');
Route::apiResource('notes', NoteController::class);

Route::apiResource('labels', LabelController::class)->except('show');