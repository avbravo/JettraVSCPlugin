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

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'generate':
                        vscode.workspace.openTextDocument({
                            content: message.code,
                            language: 'java'
                        }).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                        return;
                    case 'requestWorkspaceFiles':
                        const files = await vscode.workspace.findFiles('**/*.java');
                        const fileData = [];
                        for (let file of files) {
                            try {
                                const content = await vscode.workspace.fs.readFile(file);
                                fileData.push({
                                    path: vscode.workspace.asRelativePath(file),
                                    content: Buffer.from(content).toString('utf8')
                                });
                            } catch (e) {}
                        }
                        panel.webview.postMessage({ command: 'workspaceFiles', files: fileData });
                        return;
                    case 'showInfo':
                        vscode.window.showInformationMessage(message.text);
                        return;
                    case 'showError':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

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
        :root { --jettra-accent: #0ff; --jettra-bg: #0d1117; --jettra-border: #30363d; --jettra-text: #c9d1d9; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--jettra-bg); color: var(--jettra-text); margin: 0; padding: 0; display: flex; height: 100vh; overflow: hidden; }
        .sidebar { width: 300px; background: #161b22; border-right: 1px solid var(--jettra-border); display: flex; flex-direction: column; overflow-y: auto; }
        .topbar { display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(0,255,255,0.05); border-bottom: 1px solid var(--jettra-border); }
        .main-area { flex: 1; display: flex; flex-direction: column; }
        .canvas-area { flex: 1; padding: 20px; position: relative; display: flex; flex-direction: column; overflow-y: auto; background: #010409; }
        .canvas-drop-area { flex: 1; border: 2px dashed var(--jettra-border); border-radius: 8px; position: relative; padding: 20px; transition: all 0.3s; min-height: 500px; }
        .canvas-drop-area.drag-over { border-color: var(--jettra-accent); background: rgba(0, 255, 255, 0.05); }
        .code-area { flex: 0 0 30%; border-top: 1px solid var(--jettra-border); background: #161b22; display: flex; flex-direction: column; }
        
        /* Palette Styles */
        .palette-category { margin-bottom: 15px; padding: 0 10px; }
        .palette-cat-title { font-size: 12px; color: var(--jettra-accent); text-transform: uppercase; border-bottom: 1px solid rgba(0,255,255,0.2); padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; }
        .palette-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .palette-item { padding: 6px; background: rgba(0,255,255,0.05); border: 1px solid rgba(0,255,255,0.2); border-radius: 4px; cursor: move; color: #eee; font-size: 11px; text-align: center; transition: all 0.2s; }
        .palette-item:hover { background: rgba(0,255,255,0.2); border-color: var(--jettra-accent); color: #fff; transform: scale(1.05); }
        
        /* Canvas Item Styles */
        .canvas-item { position: relative; margin-bottom: 10px; border: 1px transparent dashed; min-height: 20px; padding: 10px; border-radius: 4px; cursor: pointer; background: rgba(255,255,255,0.02); }
        .canvas-item:hover { border-color: rgba(0,255,255,0.4); background: rgba(0,255,255,0.05); }
        .canvas-item.selected { border-color: var(--jettra-accent); box-shadow: 0 0 10px rgba(0,255,255,0.3); }
        .canvas-item .delete-tool { position: absolute; top: -8px; right: -8px; background: #ff4444; color: white; width: 18px; height: 18px; border-radius: 50%; display: none; justify-content: center; align-items: center; cursor: pointer; font-size: 10px; z-index: 100; }
        .canvas-item:hover .delete-tool { display: flex; }
        .canvas-container { border: 1px dashed rgba(255,255,255,0.2); padding: 10px; border-radius: 6px; min-height: 40px; }
        
        .j-btn { padding: 8px 16px; background: #2ea043; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .j-btn:hover { background: #3fb950; }
        .j-btn-primary { background: var(--jettra-accent); color: #000; font-weight: bold; }
        .j-btn-danger { background: #f85149; }
        
        .j-input { width: 100%; padding: 6px; background: #010409; border: 1px solid var(--jettra-border); color: white; border-radius: 4px; margin-bottom: 5px; }
        textarea.code-display { flex: 1; width: 100%; background: #010409; color: #a9b7c6; font-family: monospace; font-size: 12px; border: none; padding: 10px; resize: none; outline: none; }
        
        /* Project Explorer */
        .explorer-item { font-size: 12px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .explorer-item:hover { background: rgba(0,255,255,0.1); }
        .file-model { color: #4ade80; }
        .file-page { color: #facc15; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div style="padding: 10px; border-bottom: 1px solid var(--jettra-border);">
            <button class="j-btn" style="width: 100%;" onclick="requestWorkspaceFiles()">Load Project Files</button>
        </div>
        <div id="project-explorer" style="padding: 10px; display: none; border-bottom: 1px solid var(--jettra-border); max-height: 200px; overflow-y: auto;">
            <div style="font-size: 11px; color: var(--jettra-accent); margin-bottom: 5px; font-weight: bold;">PROJECT EXPLORER</div>
            <div id="file-tree"></div>
        </div>
        <div id="palette-container" style="padding: 10px; overflow-y: auto;"></div>
    </div>
    
    <div class="main-area">
        <div class="topbar">
            <span style="font-size: 12px; font-weight: bold; color: var(--jettra-accent);">Jettra VSC Designer</span>
            <div style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 11px;">Model:</span>
                <select id="model-select" class="j-input" style="width: 150px; margin: 0; padding: 4px;" onchange="selectModel(this.value)">
                    <option value="">None</option>
                </select>
                <button class="j-btn j-btn-primary" style="padding: 4px 10px;" onclick="generateCRUD()">CRUD ⚡</button>
                <button class="j-btn" style="padding: 4px 10px;" onclick="generateCode()">Generate Java</button>
                <button class="j-btn j-btn-danger" style="padding: 4px 10px;" onclick="clearCanvas()">Clear</button>
            </div>
        </div>
        
        <div class="canvas-area">
            <div id="canvas" class="canvas-drop-area" ondrop="drop(event)" ondragover="allowDrop(event)">
                <div class="canvas-placeholder" style="color:#8b949e; text-align:center; margin-top:100px;">Drag components here</div>
            </div>
        </div>
        
        <div class="code-area">
            <div style="padding: 5px 10px; background: rgba(0,0,0,0.5); font-size: 11px; font-weight: bold; border-bottom: 1px solid var(--jettra-border); display: flex; justify-content: space-between;">
                <span>Java Source Code</span>
                <button class="j-btn" style="padding: 2px 8px; font-size: 10px;" onclick="syncCodeToCanvas()">Sync to Canvas</button>
            </div>
            <textarea id="code-display" class="code-display" readonly>// Generated code will appear here...</textarea>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let fileCache = {};
        let models = [];
        let currentModel = null;
        let modelFields = [];

        // Setup Palette
        const categories = {
            "Typography": ["Header", "Paragraph", "Span", "Label", "Separator", "Divide"],
            "Forms": ["FormGroup", "Button", "CheckBox", "CheckBoxGroup", "CreditCard", "RadioButton", "RadioGroupButton", "ScheduleControl", "SelectOne", "SelectMany", "SelectOneIcon", "TextBox", "TextArea", "ToggleSwitch", "FileUpload", "FolderSelector", "OTPValidator", "Catcha"],
            "Date": ["DatePicker", "Time", "Calendar", "Schedule", "Organigram", "Timeline"],
            "Navigation": ["Link", "Menu", "MenuBar", "MenuItem"],
            "Feedback": ["ProgressBar", "Spinner", "Loading", "Alert", "Notification", "Clock"],
            "Media": ["Downloader", "PDFViewer", "ViewMedia", "BarCode", "Draw"],
            "Charts": ["ChartsBar", "ChartsDoughnut", "ChartsLine", "ChartsPie", "ChartsRadar"],
            "Layout": ["Grid", "Panel", "Board", "Card", "Avatar", "Carousel", "Datatable", "TabView", "Tab", "Modal", "Tree", "TreeItem", "Div", "LayoutDisplay", "Map"]
        };

        const paletteContainer = document.getElementById('palette-container');
        for (let cat in categories) {
            let catDiv = document.createElement('div');
            catDiv.className = 'palette-category';
            catDiv.innerHTML = \`<div class="palette-cat-title">\${cat}</div>\`;
            
            let grid = document.createElement('div');
            grid.className = 'palette-grid';
            
            categories[cat].forEach(comp => {
                let item = document.createElement('div');
                item.className = 'palette-item';
                item.draggable = true;
                item.innerText = comp;
                item.setAttribute('data-type', comp);
                item.ondragstart = (e) => {
                    e.dataTransfer.setData("text/plain", "component:" + comp);
                };
                grid.appendChild(item);
            });
            
            catDiv.appendChild(grid);
            paletteContainer.appendChild(catDiv);
        }

        // Drag and Drop Logic
        function allowDrop(ev) {
            ev.preventDefault();
            const target = ev.target.closest('.canvas-drop-area, .canvas-container');
            if (target) {
                target.classList.add('drag-over');
            }
        }

        function drop(ev) {
            ev.preventDefault();
            const target = ev.target.closest('.canvas-drop-area, .canvas-container');
            if (target) {
                target.classList.remove('drag-over');
            }
            
            const data = ev.dataTransfer.getData("text/plain");
            if (!data) return;

            if (data.startsWith('file:')) {
                loadFileContentToCanvas(data.substring(5));
                return;
            }
            if (data.startsWith('component:')) {
                addComponent(data.substring(10), target);
            }
        }

        document.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.canvas-drop-area, .canvas-container');
            if (target) target.classList.remove('drag-over');
        });

        function addComponent(type, parent) {
            const canvas = parent || document.getElementById('canvas');
            const placeholder = canvas.querySelector('.canvas-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            
            const el = document.createElement('div');
            el.className = 'canvas-item';
            el.setAttribute('data-type', type);
            el.setAttribute('data-props', JSON.stringify({id: type.toLowerCase() + '_' + Date.now(), text: type}));
            el.draggable = true;
            
            let content = '';
            switch(type) {
                case 'Clock': content = '<div class="j-component live-clock" style="font-size: 20px; font-weight: bold; color: #0f0; background: #000; padding: 10px; border-radius: 8px; border: 2px solid #333; display:inline-block; font-family: monospace;">12:00:00 AM</div>'; break;
                case 'Header': content = '<h2 style="margin:0; color:var(--jettra-text);">New Header</h2>'; break;
                case 'Paragraph': content = '<p style="margin:0; color:var(--jettra-text);">Sample text...</p>'; break;
                case 'Span': content = '<span style="color:var(--jettra-text);">Span Text</span>'; break;
                case 'Label': content = '<label style="color:var(--jettra-text); font-weight:bold;">Label Text</label>'; break;
                case 'Divide': content = '<div style="border-top:1px solid var(--jettra-border); margin:15px 0; width:100%"></div>'; break;
                case 'Separator': content = '<hr style="border: 0; border-top: 1px dashed var(--jettra-border); margin:15px 0; width:100%;">'; break;
                case 'Button': content = '<button class="j-btn j-btn-primary" type="button">Interactive Button</button>'; break;
                case 'TextBox': content = '<input type="text" class="j-input" placeholder="TextBox..." onfocus="this.blur()">'; break;
                case 'TextArea': content = '<textarea class="j-input" placeholder="TextArea..." rows="3" onfocus="this.blur()"></textarea>'; break;
                case 'CheckBox': content = '<div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" checked onfocus="this.blur()"/><label>CheckBox</label></div>'; break;
                case 'RadioButton': content = '<div style="display:flex; align-items:center; gap:8px;"><input type="radio" checked onfocus="this.blur()"/><label>RadioButton</label></div>'; break;
                case 'RadioGroupButton': content = '<div class="canvas-container" style="padding:10px; border:1px dashed var(--jettra-accent); min-height:60px;"><label style="font-weight:bold; color:var(--jettra-accent); display:block; margin-bottom:10px;">Radio Group</label></div>'; break;
                case 'CheckBoxGroup': content = '<div class="canvas-container" style="padding:10px; border:1px dashed var(--jettra-accent); min-height:60px;"><label style="font-weight:bold; color:var(--jettra-accent); display:block; margin-bottom:10px;">CheckBox Group</label></div>'; break;
                case 'ScheduleControl': content = '<input type="datetime-local" class="j-input" onfocus="this.blur()"/>'; break;
                case 'SelectOne': content = '<div class="select-wrapper"><label style="display:block; font-size:11px; margin-bottom:4px; color:var(--jettra-accent)">Select</label><select class="j-input" onfocus="this.blur()"><option>Option 1...</option></select></div><span style="display:none">SelectOne</span>'; break;
                case 'SelectMany': content = '<div class="select-wrapper"><label style="display:block; font-size:11px; margin-bottom:4px; color:var(--jettra-accent)">Select Multiple</label><select class="j-input" multiple="multiple" style="height:80px" onfocus="this.blur()"><option>Option 1...</option></select></div><span style="display:none">SelectMany</span>'; break;
                case 'SelectOneIcon': content = '<select class="j-input" onfocus="this.blur()"><option>⭐ Option 1...</option></select><span style="display:none">SelectOneIcon</span>'; break;
                case 'Spinner': content = '<div class="j-spinner-wrapper" style="display:inline-flex; align-items:center; border:1px solid var(--jettra-border); border-radius:8px; background:rgba(0,0,0,0.3); overflow:hidden;"><button type="button" class="j-spinner-btn j-spinner-minus" style="width:40px;height:40px;background:rgba(255,255,255,0.05);border:none;color:var(--jettra-accent);font-size:1.2rem;font-weight:bold;">-</button><div class="j-spinner-display" style="min-width:60px;text-align:center;font-family:monospace;font-size:1.1rem;color:var(--jettra-text);">0</div><button type="button" class="j-spinner-btn j-spinner-plus" style="width:40px;height:40px;background:rgba(255,255,255,0.05);border:none;color:var(--jettra-accent);font-size:1.2rem;font-weight:bold;">+</button></div>'; break;
                case 'ToggleSwitch': content = '<div style="display:flex; align-items:center; gap:8px;"><div style="width:40px;height:20px;background:var(--jettra-accent);border-radius:10px;position:relative;"><div style="width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:2px;right:2px;"></div></div><label>ToggleSwitch</label></div>'; break;
                case 'FileUpload': content = '<div style="border:1px dashed var(--jettra-accent); padding:20px; text-align:center; border-radius:8px; color:var(--jettra-text);"><div style="font-size:24px; margin-bottom:10px;">☁️</div><span>Click or drag files here to upload</span></div>'; break;
                case 'FolderSelector': content = '<div style="border:1px dashed var(--jettra-accent); padding:20px; text-align:center; border-radius:8px; color:var(--jettra-text);"><div style="font-size:24px; margin-bottom:10px;">📁</div><span>Select Directory</span></div>'; break;
                case 'OTPValidator': content = '<div class=\"j-component\" style=\"display:flex; justify-content:center; gap:5px; padding:10px;\"><input disabled style=\"width:30px; height:40px; text-align:center;\" value=\"*\"/><input disabled style=\"width:30px; height:40px; text-align:center;\" value=\"*\"/><input disabled style=\"width:30px; height:40px; text-align:center;\" value=\"*\"/><input disabled style=\"width:30px; height:40px; text-align:center;\" value=\"*\"/></div>'; break;
                case 'Catcha': content = '<div class=\"j-component\" style=\"padding:10px; border:1px solid #aaa; border-radius:4px; display:inline-flex; align-items:center; gap:10px; background:#f9f9f9;\"><input type=\"checkbox\" disabled/> <span style=\"color:#333; font-family:sans-serif\">I&#39;m not a robot</span></div>'; break;
                case 'CreditCard': content = '<div class="j-component" style="padding:15px; border:1px solid rgba(0,255,255,0.2); border-radius:12px; background:linear-gradient(145deg, #1e293b, #0f172a); min-height:100px; display:flex; flex-direction:column; gap:10px; width:280px;"><div style="font-family:monospace; font-size:16px; color:#fff; letter-spacing:2px; margin-top:20px;">•••• •••• •••• ••••</div><div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:10px;"><span class="cc-name-mock">NAME SURNAME</span><span>MM/YY</span></div><button class="j-btn j-btn-primary" style="margin-top:10px; width:100%; border-radius:8px; padding:10px;" disabled>Pay Now</button><div class="canvas-container" style="min-height:30px; border:1px dashed rgba(255,255,255,0.1); margin-top:5px; padding:5px;"></div></div>'; break;
                case 'Link': content = '<a href="javascript:void(0)" style="color:var(--jettra-accent); text-decoration:underline;"><span>Link Text</span></a>'; break;
                case 'Menu': content = '<div style="background:rgba(0,0,0,0.4); padding:10px; border-radius:4px; display:inline-block;"><div style="padding:8px 15px; cursor:pointer;"><span>Menu Item</span></div></div>'; break;
                case 'MenuBar': content = '<div class="canvas-container" style="background:rgba(0,0,0,0.4); padding:10px; border-radius:4px; display:flex; gap:15px; min-height:45px; border:1px dashed rgba(255,255,255,0.2);"></div>'; break;
                case 'MenuItem': content = '<div class="j-component" style="padding:10px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2);"><span>Menu Item</span></div>'; break;
                case 'Loading': content = '<div class="j-loading" style="display:inline-flex; align-items:center; justify-content:center; padding:10px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--jettra-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg></div>'; break;
                case 'Alert': content = '<div style="background:rgba(255,0,0,0.1); border-left:4px solid #ff4444; padding:15px; border-radius:4px; color:#ff4444; display:flex; align-items:center; gap:10px;"><b>⚠️</b><span>Alert Message</span></div>'; break;
                case 'Notification': content = '<div style="background:rgba(0,255,255,0.1); border:1px solid var(--jettra-accent); padding:15px; border-radius:8px; color:var(--jettra-text); max-width:300px; box-shadow:0 4px 12px rgba(0,0,0,0.3);"><span>Notification Message</span></div>'; break;
                case 'Downloader': content = '<div style="display:inline-flex; align-items:center; gap:8px; padding:6px 12px; background:rgba(255,255,255,0.1); border-radius:4px; cursor:pointer;"><b>💾</b><span>Download File</span></div>'; break;
                case 'PDFViewer': content = '<div style="border:1px solid #aaa; background:#eee; color:#333; height:200px; display:flex; align-items:center; justify-content:center; border-radius:4px;"><span>PDF Document Preview</span></div>'; break;
                case 'ViewMedia': content = '<div style="background:#000; color:#fff; height:200px; display:flex; align-items:center; justify-content:center; border-radius:4px;"><span>▶ Media Player</span></div>'; break;
                case 'BarCode': content = '<div class="j-component" style="padding:10px; text-align:center; border:1px dashed #fff;"><span style="font-family:monospace; font-size:24px; letter-spacing:2px">||| | || |||</span><br><span>BarCode</span></div>'; break;
                case 'Carousel': content = '<div style="display:flex; gap:10px; overflow:hidden; padding:10px; background:rgba(0,0,0,0.2); border-radius:8px;"><div style="width:150px; height:80px; background:rgba(0,255,255,0.1); border:1px solid rgba(0,255,255,0.3); border-radius:8px; display:flex; align-items:center; justify-content:center;"><span>Slide 1</span></div></div>'; break;
                case 'TabView': content = '<div style="border:1px solid rgba(0,255,255,0.2); border-radius:8px; overflow:hidden;"><div style="display:flex; background:rgba(0,0,0,0.3); border-bottom:1px solid rgba(0,255,255,0.2);" class="tab-headers"><span style="padding:10px; color:#aaa; font-size:11px;">[Tab Headers]</span></div><div class="canvas-container" style="padding:10px; min-height:100px; background:rgba(0,255,255,0.02);"></div></div>'; break;
                case 'Tab': content = '<div class="canvas-container" style="border:1px dashed var(--jettra-accent); min-height:80px; padding:10px; position:relative; background:rgba(0,0,0,0.4); margin-bottom:10px;"><span style="position:absolute; top:-12px; left:10px; background:var(--jettra-accent); color:#000; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">Tab Title</span></div>'; break;
                case 'Tree': content = '<div class="canvas-container" style="padding:10px; border:1px solid rgba(255,255,255,0.1); border-radius:4px; background:rgba(0,0,0,0.2); min-height:50px;"></div>'; break;
                case 'TreeItem': content = '<div class="canvas-container" style="padding-left:15px; border-left:1px dashed rgba(0,255,255,0.2); min-height:30px; margin-top:5px; position:relative;"><span style="position:absolute; left:-10px; top:5px; font-size:10px; color:var(--jettra-accent);">▶</span><span style="display:inline-block; margin-bottom:5px; color:#fff;">Tree Node</span></div>'; break;
                case 'Datatable': content = '<table style="width:100%;border-collapse:collapse;border:1px solid var(--jettra-border);"><tr style="background:rgba(0,255,255,0.1);border-bottom:1px solid var(--jettra-border);"><th style="padding:8px;text-align:left;">Col 1</th><th style="padding:8px;text-align:left;">Col 2</th></tr><tr><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.1);">Row 1</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.1);">Row 1</td></tr></table>'; break;
                case 'Panel': content = '<div style="border:1px solid var(--jettra-border); border-radius:4px;"><div style="padding:8px;background:rgba(0,255,255,0.1);font-weight:bold;font-size:12px;">Panel</div><div class="canvas-container" style="min-height:40px;padding:10px;"></div></div>'; break;
                case 'Div': content = '<div class="canvas-container" style="min-height:50px; border:1px dashed rgba(255,255,255,0.2); padding:10px;">Div Container</div>'; break;
                case 'FormGroup': content = '<div class="canvas-container" style="border:1px dashed var(--jettra-accent); padding:10px;"><label style="display:block;margin-bottom:5px;color:var(--jettra-text);">Form Group</label></div>'; break;
                default: content = \`<div>\${type} Component</div>\`;
            }
            
            el.innerHTML = content + '<div class="delete-tool" onclick="this.parentElement.remove(); updateCode();">&times;</div>';
            
            el.ondragstart = (e) => {
                e.stopPropagation();
                e.dataTransfer.setData("move-id", el.id);
                el.id = el.id || 'move_' + Date.now();
            };
            
            canvas.appendChild(el);
            updateCode();
        }

        function clearCanvas() {
            document.getElementById('canvas').innerHTML = '<div class="canvas-placeholder" style="color:#8b949e; text-align:center; margin-top:100px;">Drag components here</div>';
            updateCode();
        }

        // Code Generation
        function updateCode() {
            const items = document.querySelectorAll('#canvas > .canvas-item');
            if (items.length === 0) {
                document.getElementById('code-display').value = "// No components added yet";
                return;
            }
            
            let code = "package com.jettra.example.pages;\\n\\n";
            code += "import io.jettra.wui.complex.*;\\n";
            code += "import io.jettra.wui.components.*;\\n\\n";
            code += "public class GeneratedPage extends DashboardBasePage {\\n\\n";
            if (currentModel) {
                code += \`    private \${currentModel.name} model = new \${currentModel.name}();\\n\\n\`;
            }
            code += "    @Override\\n";
            code += "    protected void initCenter(Center center, String username) {\\n";
            
            function walk(nodes, parentName) {
                let out = "";
                nodes.forEach((it, idx) => {
                    const type = it.getAttribute('data-type');
                    const props = JSON.parse(it.getAttribute('data-props') || '{}');
                    const vName = props.id || (type.toLowerCase() + '_' + idx);
                    
                    if (['Panel', 'Div', 'FormGroup', 'Card', 'Grid'].includes(type)) {
                        out += \`        \${type} \${vName} = new \${type}();\\n\`;
                        const kids = it.querySelectorAll(':scope > .canvas-container > .canvas-item, :scope > div > .canvas-container > .canvas-item');
                        if (kids.length > 0) out += walk(kids, vName);
                        out += \`        \${parentName}.add(\${vName});\\n\`;
                    } else if (type === 'Header') {
                        out += \`        \${parentName}.add(new Header(2, "\${props.text}"));\\n\`;
                    } else if (type === 'Datatable') {
                        out += \`        \${parentName}.add(new Datatable().addHeaderRow("Col 1", "Col 2"));\\n\`;
                    } else {
                        out += \`        \${parentName}.add(new \${type}("\${props.text || vName}"));\\n\`;
                    }
                });
                return out;
            }
            
            code += walk(items, "center");
            code += "    }\\n}\\n";
            
            document.getElementById('code-display').value = code;
        }

        function generateCode() {
            const code = document.getElementById('code-display').value;
            vscode.postMessage({ command: 'generate', code: code });
        }

        // IPC with VS Code Extension
        function requestWorkspaceFiles() {
            vscode.postMessage({ command: 'requestWorkspaceFiles' });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'workspaceFiles') {
                fileCache = {};
                models = [];
                const treeHtml = [];
                
                message.files.forEach(f => {
                    fileCache[f.path] = f.content;
                    const name = f.path.split('/').pop();
                    let cls = '';
                    if (name.endsWith('Model.java')) {
                        models.push({ name: name.replace('.java', ''), path: f.path });
                        cls = 'file-model';
                    } else if (name.endsWith('Page.java')) {
                        cls = 'file-page';
                    }
                    
                    treeHtml.push(\`
                        <div class="explorer-item \${cls}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', 'file:\${f.path}')" onclick="loadFileContentToCanvas('\${f.path}')">
                            📄 \${name}
                        </div>
                    \`);
                });
                
                document.getElementById('file-tree').innerHTML = treeHtml.join('');
                document.getElementById('project-explorer').style.display = 'block';
                
                // Update Model Select
                const select = document.getElementById('model-select');
                select.innerHTML = '<option value="">None</option>' + 
                    models.map(m => \`<option value="\${m.name}">\${m.name}</option>\`).join('');
                
                vscode.postMessage({ command: 'showInfo', text: \`Loaded \${message.files.length} files.\` });
            }
        });

        function selectModel(name) {
            currentModel = models.find(m => m.name === name);
            if (currentModel) {
                const content = fileCache[currentModel.path];
                const fieldRegex = /(?:private|protected|public)?\\s+([\\w<>]+)\\s+(\\w+);/g;
                let match;
                modelFields = [];
                while ((match = fieldRegex.exec(content)) !== null) {
                    modelFields.push({ type: match[1], name: match[2] });
                }
                vscode.postMessage({ command: 'showInfo', text: \`Selected model \${name} with \${modelFields.length} fields.\` });
            } else {
                modelFields = [];
            }
            updateCode();
        }

        function generateCRUD() {
            if (!currentModel) {
                vscode.postMessage({ command: 'showError', text: 'Select a Model first.' });
                return;
            }
            
            const baseName = currentModel.name.replace('Model', '');
            let code = \`package com.jettra.example.pages;\\n\\nimport io.jettra.wui.complex.*;\\nimport io.jettra.wui.components.*;\\n\\n\`;
            code += \`public class \${baseName}Page extends DashboardBasePage {\\n\\n\`;
            code += \`    private \${currentModel.name} model = new \${currentModel.name}();\\n\\n\`;
            code += \`    @Override\\n    protected void initCenter(Center center, String username) {\\n\`;
            code += \`        center.add(new Header(2, "Mantenimiento de \${baseName}"));\\n\\n\`;
            
            // Form
            code += \`        Form form = new Form("\${baseName.toLowerCase()}Form", "/\${baseName.toLowerCase()}");\\n\`;
            modelFields.forEach(f => {
                code += \`        FormGroup g_\${f.name} = new FormGroup();\\n\`;
                code += \`        g_\${f.name}.add(new Label("\${f.name}"));\\n\`;
                if (f.type.includes('List')) {
                    code += \`        g_\${f.name}.add(new SelectMany("\${f.name}"));\\n\`;
                } else if (f.type === 'Date') {
                    code += \`        g_\${f.name}.add(new DatePicker("\${f.name}", "\${f.name}"));\\n\`;
                } else {
                    code += \`        g_\${f.name}.add(new TextBox("\${f.name}", "\${f.name}"));\\n\`;
                }
                code += \`        form.add(g_\${f.name});\\n\`;
            });
            code += \`        form.add(new Button("Guardar").addClass("j-btn").addClass("j-btn-primary"));\\n\`;
            code += \`        center.add(form);\\n\\n\`;
            
            // Datatable
            code += \`        Datatable table = new Datatable().addHeaderRow(\\n            \`;
            code += modelFields.map(f => \`"\${f.name}"\`).join(', ') + \`\\n        );\\n\`;
            code += \`        center.add(table);\\n\`;
            
            code += \`    }\\n}\\n\`;
            
            document.getElementById('code-display').value = code;
            syncCodeToCanvas();
            vscode.postMessage({ command: 'showInfo', text: \`CRUD Generated for \${baseName}\` });
        }

        function loadFileContentToCanvas(path) {
            const content = fileCache[path];
            if (content) {
                document.getElementById('code-display').value = content;
                syncCodeToCanvas();
            }
        }

        function syncCodeToCanvas() {
            const code = document.getElementById('code-display').value;
            const canvas = document.getElementById('canvas');
            canvas.innerHTML = '';
            
            let lines = code.split('\\n');
            let found = false;
            lines.forEach(line => {
                let m = line.match(/\\.add\\(\\s*new\\s+([A-Z][a-zA-Z0-9_]*)\\s*\\(/);
                if (m) {
                    found = true;
                    addComponent(m[1], canvas);
                }
            });
            
            if (!found) {
                canvas.innerHTML = '<div class="canvas-placeholder" style="color:#8b949e; text-align:center; margin-top:100px;">Drag components here</div>';
            }
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
