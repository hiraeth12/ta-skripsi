import fs from "node:fs";
import path from "node:path";
import * as configPlugins from "@expo/config-plugins";

const { withDangerousMod, withStringsXml } = configPlugins;

const ANDROID_NOTIFICATION_SOUND_FILES = ["eq_eva.wav", "tsu_eva.wav"];
const ANDROID_CLEAN_CODEGEN_ORDER_BEGIN =
  "// @generated begin react-native-clean-codegen-order - expo config plugin";
const ANDROID_CLEAN_CODEGEN_ORDER_END =
  "// @generated end react-native-clean-codegen-order";
const ANDROID_CLEAN_CODEGEN_ORDER_BLOCK = `${ANDROID_CLEAN_CODEGEN_ORDER_BEGIN}
gradle.projectsEvaluated {
  def appNativeCleanTasks = project(':app').tasks.matching {
    it.name.startsWith('externalNativeBuildClean')
  }
  def dependencyCodegenTasks = subprojects.collectMany { subproject ->
    subproject.path == ':app' ? [] : subproject.tasks.matching {
      it.name == 'generateCodegenArtifactsFromSchema'
    }.toList()
  }

  appNativeCleanTasks.configureEach { task ->
    task.dependsOn(dependencyCodegenTasks)
  }

  subprojects { subproject ->
    if (subproject.path != ':app') {
      subproject.tasks.matching { it.name == 'clean' }.configureEach { task ->
        task.mustRunAfter(appNativeCleanTasks)
      }
    }
  }
}
${ANDROID_CLEAN_CODEGEN_ORDER_END}`;

function withMapboxAccessToken(config) {
  return withStringsXml(config, (config) => {
    const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      throw new Error(
        "EXPO_PUBLIC_MAPBOX_TOKEN belum di-set. Tambahkan variable ini di EAS Environment untuk development, preview, dan production.",
      );
    }

    const strings = config.modResults.resources.string ?? [];
    const withoutOldToken = strings.filter(
      (item) => item.$?.name !== "mapbox_access_token",
    );

    config.modResults.resources.string = [
      ...withoutOldToken,
      {
        _: token,
        $: {
          name: "mapbox_access_token",
          translatable: "false",
        },
      },
    ];

    return config;
  });
}

function withAndroidNotificationSound(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const destinationDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "raw",
      );
      fs.mkdirSync(destinationDir, { recursive: true });

      for (const soundFile of ANDROID_NOTIFICATION_SOUND_FILES) {
        const source = path.join(
          config.modRequest.projectRoot,
          "assets",
          "sounds",
          soundFile,
        );
        const destination = path.join(destinationDir, soundFile);

        if (!fs.existsSync(source)) {
          throw new Error(`Notification sound file tidak ditemukan: ${source}`);
        }

        fs.copyFileSync(source, destination);
      }

      return config;
    },
  ]);
}

function withAndroidCleanCodegenOrder(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        "build.gradle",
      );
      const contents = fs.readFileSync(buildGradlePath, "utf8");
      const generatedBlockPattern = new RegExp(
        `${escapeRegExp(ANDROID_CLEAN_CODEGEN_ORDER_BEGIN)}[\\s\\S]*?${escapeRegExp(ANDROID_CLEAN_CODEGEN_ORDER_END)}`,
      );

      if (generatedBlockPattern.test(contents)) {
        fs.writeFileSync(
          buildGradlePath,
          contents.replace(generatedBlockPattern, ANDROID_CLEAN_CODEGEN_ORDER_BLOCK),
        );
        return config;
      }

      const anchor = 'apply plugin: "com.facebook.react.rootproject"';
      if (!contents.includes(anchor)) {
        throw new Error(
          `Tidak bisa memasang Gradle clean ordering karena anchor tidak ditemukan: ${anchor}`,
        );
      }

      fs.writeFileSync(
        buildGradlePath,
        contents.replace(anchor, `${anchor}\n\n${ANDROID_CLEAN_CODEGEN_ORDER_BLOCK}`),
      );

      return config;
    },
  ]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPlugin(plugins, pluginName) {
  return plugins.some((plugin) => {
    if (typeof plugin === "string") {
      return plugin === pluginName;
    }

    return Array.isArray(plugin) && plugin[0] === pluginName;
  });
}

export default ({ config }) => {
  const plugins = config.plugins ?? [];
  const pluginsWithMapbox = hasPlugin(plugins, "@rnmapbox/maps")
    ? plugins
    : [...plugins, "@rnmapbox/maps"];

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ??
        config.android?.googleServicesFile ??
        "./google-services.json",
    },
    plugins: [
      withMapboxAccessToken,
      withAndroidNotificationSound,
      withAndroidCleanCodegenOrder,
      ...pluginsWithMapbox,
      "@react-native-community/datetimepicker",
      
    ],
  };
};
