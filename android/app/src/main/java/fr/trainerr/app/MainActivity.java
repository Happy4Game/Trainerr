package fr.trainerr.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Small native plugins of the app, registered before the bridge starts.
        registerPlugin(SessionNotificationPlugin.class);
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(FileSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
