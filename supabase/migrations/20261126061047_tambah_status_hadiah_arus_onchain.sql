-- Tambah kategori 'hadiah' (hadiah / reward protokol seperti Meteora, airdrop, insentif)
-- pada arus_onchain: khusus transfer masuk, wajib catatan, masuk ke nilai pool tanpa mengubah porsi.

alter table public.arus_onchain
  drop constraint if exists arus_onchain_status_check,
  drop constraint if exists arus_biaya_bukan_wajib_catatan,
  drop constraint if exists arus_hadiah_wajib_masuk;

alter table public.arus_onchain
  add constraint arus_onchain_status_check
    check (status in ('belum', 'dicocokkan', 'hadiah', 'biaya', 'bukan_arus')),
  add constraint arus_biaya_bukan_wajib_catatan
    check (
      status not in ('hadiah', 'biaya', 'bukan_arus')
      or (catatan is not null and char_length(btrim(catatan)) > 0)
    ),
  add constraint arus_hadiah_wajib_masuk
    check (status <> 'hadiah' or arah = 'masuk');
