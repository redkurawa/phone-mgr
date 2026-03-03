-- Script untuk menghapus assignment nomor yang kelebihan: 02150889832
-- Nomor ini akan dikembalikan ke status KOSONG tanpa masuk ke history

DO $$
DECLARE
    v_phone_id UUID;
BEGIN
    -- Cari ID dari nomor yang akan di-deassign
    SELECT id INTO v_phone_id
    FROM phone_inventory
    WHERE phone_number = '02150889832';

    IF v_phone_id IS NULL THEN
        RAISE EXCEPTION 'Nomor 02150889832 tidak ditemukan dalam database';
    END IF;

    -- Update phone_inventory: ubah status ke KOSONG dan hapus client
    -- TIDAK ada insert ke phone_events (history) - karena ini murni kelebihan input
    UPDATE phone_inventory
    SET 
        status = 'KOSONG',
        current_client_name = NULL,
        updated_at = NOW(),
        version = version + 1
    WHERE id = v_phone_id;

    RAISE NOTICE 'Nomor 02150889832 berhasil dikembalikan ke status KOSONG (tanpa history)';
END $$;
