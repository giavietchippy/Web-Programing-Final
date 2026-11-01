<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Label extends Model
{
    protected $fillable = ['user_id', 'name'];

    public function notes(): BelongsToMany
    {
        return $this->belongsToMany(Note::class);
    }
}