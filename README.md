# Jettra VSC Designer

Visual Studio Code extension for JettraWUI Visual Design.

## Features

- **Component Palette**: Drag and drop JettraWUI components (Header, Button, Datatable, etc.) onto the canvas.
- **Visual Design**: Real-time visual representation of your web interface.
- **Code Generation**: Automatically generate Java code compatible with JettraWUI framework.

## Installation & Development

There are two ways to run this extension:

### Option 1: Development Mode (Recommended)
1. Open this `JettraVSCPlugin` folder directly in Visual Studio Code.
2. Run `npm install` in the terminal to ensure dependencies are ready.
3. Press **F5** (or go to the 'Run and Debug' view and click 'Run Extension').
4. A new VS Code window will open (Extension Development Host).
5. In that new window, press `Ctrl+Shift+P` and search for **"Open Jettra Designer"**.

### Option 2: Manual Installation
1. Copy the entire `JettraVSCPlugin` folder to:
   - Linux: `~/.vscode/extensions/jettra.jettravscplugin-1.0.0`
   - Windows: `%USERPROFILE%\\.vscode\\extensions\\jettra.jettravscplugin-1.0.0`
   - macOS: `~/.vscode/extensions/jettra.jettravscplugin-1.0.0`
2. **Restart** Visual Studio Code completely.

## How to use

1. Run the command `Open Jettra Designer` from the Command Palette (`Ctrl+Shift+P`).
2. Drag components from the left sidebar to the central canvas.
3. Click "Generate Java Code" to get the corresponding JettraWUI source code.




. Cómo instalar JettraVSCPlugin en VS Code (Antigravity)
Dado que estás desarrollando el plugin localmente, tienes dos formas de "instalarlo" o probarlo:

Opción A: Modo Desarrollo (Recomendado para probar)
Abre la carpeta JettraVSCPlugin en VS Code.
Presiona F5. Esto abrirá una nueva ventana de VS Code ("Extension Development Host") con el plugin cargado.
En esa nueva ventana, abre la paleta de comandos (Ctrl+Shift+P) y ejecuta: "Open Jettra Designer".
Opción B: Instalación Permanente (Empaquetado .vsix)
Para instalarlo de forma fija en tu VS Code principal:

Instala la herramienta de empaquetado:
bash
npm install -g @vscode/vsce
mpaqueta el plugin: (desde la carpeta JettraVSCPlugin)
bash
vsce package
Esto generará un archivo llamado jettravscplugin-1.0.0.vsix.
Instala el archivo generado:
Ve a la pestaña de Extensiones en VS Code.
Haz clic en los tres puntos (...) en la esquina superior derecha.
Selecciona "Install from VSIX..." y elige el archivo creado.
