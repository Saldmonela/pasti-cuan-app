-keepattributes *Annotation*,InnerClasses,Signature
-keep class id.pasticuan.wallet.domain.model.** { *; }
-keep class id.pasticuan.wallet.data.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.Serializable *;
}
