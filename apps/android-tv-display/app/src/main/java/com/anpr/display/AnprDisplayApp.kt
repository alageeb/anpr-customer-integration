package com.anpr.display

import android.app.Application
import com.anpr.display.di.ServiceLocator

class AnprDisplayApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }

    override fun onTerminate() {
        super.onTerminate()
        ServiceLocator.destroy()
    }
}
