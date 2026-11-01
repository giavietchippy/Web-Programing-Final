<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileController;
use Illuminate\Http\Request;
use App\Http\Controllers\PreferencesController;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('api')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verify'])
        ->middleware('signed')
        ->name('verification.verify');
    Route::put('/password', [AuthController::class, 'changePassword'])
        ->middleware(['auth', 'auth.session']);
    Route::post('/profile', [ProfileController::class, 'update'])
        ->middleware(['auth', 'auth.session']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/preferences', [PreferencesController::class, 'update'])
        ->middleware(['auth', 'auth.session']);
    Route::get('/user', fn (Request $request) => $request->user())->middleware(['auth', 'auth.session']);
});