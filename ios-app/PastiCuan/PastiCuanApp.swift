import SwiftUI
import PastiCuanCore

@main
struct PastiCuanApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
    }
}

/// Tahap 1: mode prototype lokal memakai mesin hitung PastiCuanCore. Layar lengkap menyusul bertahap.
@MainActor
final class AppStore: ObservableObject {
    @Published var data: DataPool?
    @Published var hasil: PoolEngine.HasilPool?
    @Published var galat: String?
    let saya = "salman"

    init() {
        do {
            let sim = try OnchainSimulator()
            let d = SeedData.buatDataAwal(sim)
            let titik = sim.titikEstimasi(d.snapshots, d.permintaan) + sim.semuaTitik()
            let sekarang = Formatters.ms(SeedData.waktuAwal)
            let resmi = PoolEngine.hitungPool(anggota: d.anggota, snapshots: d.snapshots, permintaan: d.permintaan,
                                              set: d.pengaturan, arus: d.arus, titikReferensi: titik)
            data = d
            hasil = PoolEngine.terapkanLive(resmi, anggota: d.anggota, snaps: d.snapshots, arus: d.arus,
                                            titik: titik, sekarang: sekarang, set: d.pengaturan)
        } catch {
            galat = error.localizedDescription
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Halo, Salman").font(.system(size: 25, weight: .bold))
                if let h = store.hasil, let pos = h.posisi.first(where: { $0.id == store.saya }) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Nilai kamu").font(.system(size: 13)).foregroundStyle(.secondary)
                        Text(Formatters.usd(pos.netUsd)).font(.system(size: 40, weight: .heavy)).monospacedDigit()
                        Text(Formatters.sol(pos.netSol)).font(.system(size: 13)).foregroundStyle(.secondary)
                    }
                    .padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 24))
                } else if let e = store.galat {
                    Text(e).foregroundStyle(.red)
                }
            }
            .padding(16)
        }
    }
}
