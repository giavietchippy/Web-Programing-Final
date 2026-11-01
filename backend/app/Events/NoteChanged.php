<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class NoteChanged implements ShouldBroadcastNow
{
    public function __construct(
        public readonly int $noteId,
        public readonly string $roomKey,
        public readonly string $title,
        public readonly string $content,
        public readonly int $version,
        public readonly int $editorUserId,
        public readonly ?string $clientId,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("note.{$this->noteId}.{$this->roomKey}")];
    }

    public function broadcastAs(): string
    {
        return 'note.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'note_id' => $this->noteId,
            'title' => $this->title,
            'content' => $this->content,
            'version' => $this->version,
            'editor_user_id' => $this->editorUserId,
            'client_id' => $this->clientId,
        ];
    }
}
