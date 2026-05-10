package com.myapp

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
// Force-disable Fabric at runtime to avoid react-native-maps crashes
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MyApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
      // Pass `false` to explicitly disable Fabric regardless of build flags.
      DefaultReactActivityDelegate(this, mainComponentName, false)
}
