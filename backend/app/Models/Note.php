<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Note extends Model
{
    protected $fillable = ['user_id', 'title', 'content'];
    protected $hidden = ['password_hash', 'realtime_key'];

    protected static function booted(): void
    {
        static::creating(function (Note $note) {
            $note->realtime_key ??= Str::random(32);
        });
    }

    protected function casts(): array
    {
        return ['pinned_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class)->orderBy('labels.name');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(NoteShare::class);
    }
}
