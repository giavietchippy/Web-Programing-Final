<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Note extends Model
{
    protected $fillable = ['user_id', 'title', 'content'];
    protected $hidden = ['password_hash'];
    protected function casts(): array
    {
        return ['pinned_at' => 'datetime'];
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class)->orderBy('labels.name');
    }
}