package id.pasticuan.wallet

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import id.pasticuan.wallet.ui.PastiCuanApp
import id.pasticuan.wallet.ui.state.AppViewModel

class MainActivity : ComponentActivity() {
    private val appViewModel: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        intent?.data?.let { appViewModel.tanganiCallbackLogin(it) }
        setContent {
            PastiCuanApp(viewModel = appViewModel)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.let { appViewModel.tanganiCallbackLogin(it) }
    }
}
