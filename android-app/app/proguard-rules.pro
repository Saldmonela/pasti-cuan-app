-keepattributes *Annotation*,InnerClasses,Signature
-keep class id.pasticuan.wallet.domain.model.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.Serializable *;
}
