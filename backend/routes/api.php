<?php

use App\Http\Controllers\NoteController;
use Illuminate\Support\Facades\Route;

// TODO: khi Member 1 merge Sanctum, bọc nhóm route này bằng middleware 'auth:sanctum'
Route::apiResource('notes', NoteController::class);