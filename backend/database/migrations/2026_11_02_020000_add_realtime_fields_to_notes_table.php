<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->unsignedBigInteger('content_version')->default(0);
            $table->string('realtime_key', 32)->nullable();
        });

        // Cấp mã phòng riêng cho ghi chú cũ.
        DB::table('notes')->select('id')->orderBy('id')->chunkById(100, function ($notes) {
            foreach ($notes as $note) {
                DB::table('notes')->where('id', $note->id)
                    ->update(['realtime_key' => Str::random(32)]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn(['content_version', 'realtime_key']);
        });
    }
};
