const vscode = require('vscode');

function activate(context) {
    let disposable = vscode.commands.registerCommand('jettra.openDesigner', function () {
        const panel = vscode.window.createWebviewPanel(
            'jettraDesigner',
            'Jettra Visual Designer',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = getWebviewContent();
    });

    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'generate':
                    vscode.workspace.openTextDocument({
                        content: message.code,
                        language: 'java'
                    }).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                    return;
            }
        },
        undefined,
        context.subscriptions
    );

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jettra Designer</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0d1117; color: white; margin: 0; padding: 0; display: flex; height: 100vh; overflow: hidden; }
            .sidebar { width: 250px; background: #161b22; border-right: 1px solid #30363d; display: flex; flex-direction: column; }
            .palette { flex: 1; padding: 15px; overflow-y: auto; }
            .canvas-area { flex: 1; padding: 30px; background: #010409; position: relative; display: flex; flex-direction: column; overflow-y: auto; }
            .canvas-drop-area { flex: 1; border: 2px dashed #30363d; border-radius: 8px; position: relative; padding: 20px; transition: all 0.3s; min-height: 500px; }
            .canvas-drop-area.drag-over { border-color: #58a6ff; background: rgba(88, 166, 255, 0.05); }
            .component-item { background: #21262d; border: 1px solid #30363d; padding: 10px; margin-bottom: 8px; border-radius: 6px; cursor: grab; display: flex; align-items: center; gap: 10px; transition: transform 0.2s; }
            .component-item:hover { transform: translateX(5px); background: #30363d; }
            .j-btn { padding: 10px 20px; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer; }
            .j-header { color: #58a6ff; margin-bottom: 15px; }
        </style>
    </head>
    <body>
        <div class="sidebar">
            <div style="padding:15px; border-bottom:1px solid #30363d; font-weight:bold; color:#58a6ff;">Components</div>
            <div class="palette">
                <div class="component-item" draggable="true" ondragstart="drag(event)" data-type="Header">Header</div>
                <div class="component-item" draggable="true" ondragstart="drag(event)" data-type="Button">Button</div>
                <div class="component-item" draggable="true" ondragstart="drag(event)" data-type="TextBox">TextBox</div>
                <div class="component-item" draggable="true" ondragstart="drag(event)" data-type="Datatable">Datatable</div>
                <div class="component-item" draggable="true" ondragstart="drag(event)" data-type="Div">Div Container</div>
            </div>
        </div>
        <div class="canvas-area">
            <h2 class="j-header">Jettra VSC Designer</h2>
            <div id="canvas" class="canvas-drop-area" ondrop="drop(event)" ondragover="allowDrop(event)">
                <div style="color:#8b949e; text-align:center; margin-top:100px;">Drag components here to design your page</div>
            </div>
            <div style="margin-top:20px; display:flex; gap:10px;">
                <button class="j-btn" onclick="generateCode()">Generate Java Code</button>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            function allowDrop(ev) {
                ev.preventDefault();
                document.getElementById('canvas').classList.add('drag-over');
            }

            function drag(ev) {
                ev.dataTransfer.setData("type", ev.target.getAttribute('data-type'));
            }

            function drop(ev) {
                ev.preventDefault();
                document.getElementById('canvas').classList.remove('drag-over');
                const type = ev.dataTransfer.getData("type");
                addComponent(type);
            }

            function addComponent(type) {
                const canvas = document.getElementById('canvas');
                if (canvas.innerHTML.includes('Drag components here')) canvas.innerHTML = '';
                
                const el = document.createElement('div');
                el.style.padding = '15px';
                el.style.border = '1px solid #30363d';
                el.style.marginBottom = '10px';
                el.style.borderRadius = '6px';
                el.style.background = '#161b22';
                
                if (type === 'Header') el.innerHTML = '<h2 style="margin:0; color:#58a6ff;">Header Component</h2>';
                else if (type === 'Button') el.innerHTML = '<button class="j-btn">Button Component</button>';
                else if (type === 'TextBox') el.innerHTML = '<input type="text" style="width:100%; padding:8px; background:#0d1117; border:1px solid #30363d; color:white; border-radius:4px;" placeholder="TextBox Component">';
                else if (type === 'Datatable') el.innerHTML = '<table style="width:100%; border-collapse:collapse; margin-top:10px;"><tr style="background:#21262d;"><th style="padding:10px; border:1px solid #30363d;">Col 1</th><th style="padding:10px; border:1px solid #30363d;">Col 2</th></tr><tr><td style="padding:10px; border:1px solid #30363d;">Data 1</td><td style="padding:10px; border:1px solid #30363d;">Data 2</td></tr></table>';
                else el.innerHTML = '<div>Container Component</div>';
                
                canvas.appendChild(el);
            }

            function generateCode() {
                const canvas = document.getElementById('canvas');
                const items = canvas.querySelectorAll(':scope > div'); // Adjust selector based on addComponent
                
                let javaCode = "package com.jettra.example.pages;\\n\\n";
                javaCode += "import io.jettra.wui.complex.*;\\n";
                javaCode += "import io.jettra.wui.components.*;\\n\\n";
                javaCode += "public class GeneratedPage extends DashboardBasePage {\\n\\n";
                javaCode += "    @Override\\n";
                javaCode += "    protected void initCenter(Center center, String username) {\\n";
                javaCode += "        Div main = new Div();\\n";
                
                items.forEach((it, idx) => {
                    const type = it.getAttribute('data-type');
                    if (type === 'Header') javaCode += "        main.add(new Header(2, \"Header Component\"));\\n";
                    else if (type === 'Button') javaCode += "        main.add(new Button(\"Button Component\"));\\n";
                    else if (type === 'TextBox') javaCode += "        main.add(new TextBox(\"textBox_" + idx + "\", \"Placeholder\"));\\n";
                    else if (type === 'Datatable') javaCode += "        main.add(new Datatable().addHeaderRow(\"Col 1\", \"Col 2\"));\\n";
                });
                
                javaCode += "        center.add(main);\\n";
                javaCode += "    }\\n";
                javaCode += "}\\n";
                
                vscode.postMessage({ command: 'generate', code: javaCode });
            }
        </script>
    </body>
    </html>`;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
