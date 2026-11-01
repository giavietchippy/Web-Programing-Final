<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PreferencesController extends Controller
{
    public function update(Request $request)
    {
        $data = $request->validate([
            'theme' => ['required', Rule::in(['light', 'dark'])],
            'font_size' => ['required', Rule::in(['small', 'medium', 'large'])],
            'note_color' => ['required', Rule::in(['default', 'yellow', 'green', 'blue', 'pink'])],
        ]);

        $user = $request->user();
        $user->forceFill($data)->save();

        return $user;
    }
}