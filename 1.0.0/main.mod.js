import { PolyMod, MixinType } from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.2/PolyTypes.js";

const DEFAULT_STEPS = [
    { key: "W", ms: 1000 },
    { key: "A", ms: 125 },
    { key: "D", ms: 125 }
];

class PolyTrackTAS extends PolyMod {
    input = null;
    running = false;
    stopRequested = false;
    steps = DEFAULT_STEPS.map(x => ({...x}));
    panel = null;

    init = (pml) => {
        this.pml = pml;

        /*
         * PolyTrack 0.6.2 creates the vehicle input object with:
         *   (0, R.GG)(this, Da, new Wt(u), "f"),
         * and stores it in the private field represented by Da.
         *
         * The mixin exposes that INTERNAL input object so the TAS
         * can set up/left/right/down directly.
         */
        pml.registerGlobalMixin({
            type: MixinType.INSERT,
            token: '(0, R.GG)(this, Da, new Wt(u), "f"),',
            func: 'window.__polytrackTASInput = (0, R.gn)(this, Da, "f");'
        });
    };

    postInit = () => {
        this.makePanel();

        window.addEventListener("keydown", (e) => {
            if (e.code === "Escape") this.stop();
        });
    };

    async play() {
        if (this.running) return;

        const input = window.__polytrackTASInput;
        if (!input) {
            alert("TAS input hook was not found. This build is not compatible with the 0.6.2 TAS hook.");
            return;
        }

        this.running = true;
        this.stopRequested = false;

        try {
            for (const step of this.steps) {
                if (this.stopRequested) break;

                const k = String(step.key).toUpperCase();
                const ms = Math.max(0, Number(step.ms) || 0);

                this.setInput(input, k, true);
                await this.sleep(ms);
                this.setInput(input, k, false);
            }
        } finally {
            this.clearInput();
            this.running = false;
        }
    }

    stop() {
        this.stopRequested = true;
        this.clearInput();
    }

    setInput(input, key, value) {
        if (key === "W") input.up = value;
        else if (key === "A") input.left = value;
        else if (key === "D") input.right = value;
        else if (key === "S") input.down = value;
    }

    clearInput() {
        const input = window.__polytrackTASInput;
        if (!input) return;
        input.up = false;
        input.left = false;
        input.right = false;
        input.down = false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    makePanel() {
        const panel = document.createElement("div");
        this.panel = panel;

        Object.assign(panel.style, {
            position: "fixed",
            right: "12px",
            top: "12px",
            zIndex: "999999",
            background: "rgba(20,20,20,.92)",
            color: "#fff",
            padding: "10px",
            borderRadius: "8px",
            fontFamily: "sans-serif",
            fontSize: "13px",
            minWidth: "240px",
            boxShadow: "0 4px 20px rgba(0,0,0,.35)"
        });

        const title = document.createElement("div");
        title.textContent = "PolyTrack TAS Macro 0.6.2";
        title.style.fontWeight = "700";
        title.style.marginBottom = "8px";
        panel.appendChild(title);

        const rows = document.createElement("div");
        panel.appendChild(rows);

        const render = () => {
            rows.innerHTML = "";

            this.steps.forEach((step, index) => {
                const row = document.createElement("div");
                row.style.display = "grid";
                row.style.gridTemplateColumns = "60px 90px 1fr 24px";
                row.style.gap = "4px";
                row.style.marginBottom = "4px";

                const select = document.createElement("select");
                ["W","A","S","D"].forEach(k => {
                    const opt = document.createElement("option");
                    opt.value = k;
                    opt.textContent = k;
                    select.appendChild(opt);
                });
                select.value = step.key;
                select.onchange = () => step.key = select.value;

                const input = document.createElement("input");
                input.type = "number";
                input.min = "0";
                input.step = "1";
                input.value = String(step.ms);
                input.title = "Duration in milliseconds";
                input.onchange = () => step.ms = Math.max(0, Number(input.value) || 0);

                const label = document.createElement("span");
                label.textContent = `${index + 1}`;

                const del = document.createElement("button");
                del.textContent = "×";
                del.onclick = () => {
                    this.steps.splice(index, 1);
                    render();
                };

                row.append(label, select, input, del);
                rows.appendChild(row);
            });
        };

        const add = document.createElement("button");
        add.textContent = "Add step";
        add.onclick = () => {
            this.steps.push({key: "W", ms: 100});
            render();
        };

        const start = document.createElement("button");
        start.textContent = "START";
        start.style.marginLeft = "6px";
        start.onclick = () => this.play();

        const stop = document.createElement("button");
        stop.textContent = "STOP";
        stop.style.marginLeft = "6px";
        stop.onclick = () => this.stop();

        panel.append(add, start, stop);

        const hint = document.createElement("div");
        hint.textContent = "Times are milliseconds. ESC = stop.";
        hint.style.marginTop = "7px";
        hint.style.opacity = ".75";
        hint.style.fontSize = "11px";
        panel.appendChild(hint);

        document.body.appendChild(panel);
        render();
    }
}

export let polyMod = new PolyTrackTAS();
