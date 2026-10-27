package fr.trainerr.app;

import android.app.Activity;
import android.os.Bundle;
import android.widget.ScrollView;
import android.widget.TextView;

/**
 * Shown by Health Connect when the user taps the privacy policy link on its
 * permission screen: what Trainerr reads, and that it stays on the phone.
 * https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started
 */
public class PermissionsRationaleActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        TextView text = new TextView(this);
        text.setText(R.string.health_rationale);
        text.setTextSize(16);
        text.setPadding(padding, padding, padding, padding);
        ScrollView scroll = new ScrollView(this);
        scroll.addView(text);
        setContentView(scroll);
    }
}
