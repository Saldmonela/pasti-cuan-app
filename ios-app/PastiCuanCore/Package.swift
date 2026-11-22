// swift-tools-version:5.9
import PackageDescription

// Mesin hitung Pasti Cuan untuk iOS: port 1:1 dari android-app/.../domain (PoolEngine.kt, Formatters.kt,
// OnchainSimulator.kt, SeedData.kt) dan src/lib/engine.ts. Dipisah sebagai package supaya bisa dites
// dengan `swift test` di macOS tanpa simulator.
let package = Package(
    name: "PastiCuanCore",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        .library(name: "PastiCuanCore", targets: ["PastiCuanCore"])
    ],
    targets: [
        .target(
            name: "PastiCuanCore",
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "PastiCuanCoreTests",
            dependencies: ["PastiCuanCore"]
        )
    ]
)
