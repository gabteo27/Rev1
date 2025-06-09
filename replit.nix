{ pkgs }: {
  deps = [
    # Dependencias del proyecto
    pkgs.nodejs_20
    pkgs.nodePackages.npm
    pkgs.postgresql

    # Dependencias para la compilación de Android
    pkgs.android-sdk
    pkgs.android-sdk-cmdline-tools
    pkgs.android-sdk-build-tools
    pkgs.openjdk11

    # Dependencias para Capacitor
    pkgs.nodePackages.capacitor-cli
  ];
  environment.JAVA_HOME = pkgs.openjdk11;
}