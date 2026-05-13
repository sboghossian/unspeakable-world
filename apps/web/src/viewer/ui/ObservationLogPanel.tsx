import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";

import { log } from "../../lib/logger";
import { useExtraLayerEnabled } from "../extra-layers/state";
import {
  addObservation,
  deleteObservation,
  exportCsv,
  exportJson,
  importJson,
  listObservations,
  subscribe as subscribeStore,
  updateObservation,
  type Observation,
  type ObservationSeeing,
} from "../obs-log/store";
import type { SearchEntry, SearchIndex } from "../search/search-index";
import type { ExtraLayersHost } from "./ExtraLayersPanel";

/**
 * 📒 ObservationLogPanel — top-bar popover for the user's personal
 * observation log. Mirrors the SonificationControls layout: a small
 * pill that opens a panel with list + add/edit form. Only renders
 * when the layer is enabled.
 *
 * Editing happens in-panel; new entries default the current date to
 * `now`. Target lookup uses the existing local SearchIndex (~1,300
 * named objects) so RA/Dec auto-fills when the user picks a known
 * target. Free-text targets are accepted too — coords required.
 */

const LAYER_ID = "obs-log";

type SceneFlyHost = ExtraLayersHost & {
  flyTo(dir: Vector3, durationMs?: number): void;
};

type Props = {
  scene: SceneFlyHost | null;
  searchIndex?: SearchIndex | null;
};

type Mode =
  | { kind: "list" }
  | { kind: "add" }
  | { kind: "edit"; id: string };

type FormState = {
  target_name: string;
  ra_deg: string;
  dec_deg: string;
  date: string;
  location: string;
  telescope: string;
  eyepiece: string;
  seeing: string;
  transparency: string;
  notes: string;
  photo_url: string;
};

const EMPTY_FORM: FormState = {
  target_name: "",
  ra_deg: "",
  dec_deg: "",
  date: "",
  location: "",
  telescope: "",
  eyepiece: "",
  seeing: "",
  transparency: "",
  notes: "",
  photo_url: "",
};

function nowLocalIso(): string {
  // datetime-local input expects "YYYY-MM-DDTHH:mm".
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseSeeing(v: string): ObservationSeeing | undefined {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) {
    return n;
  }
  return undefined;
}

function obsToForm(o: Observation): FormState {
  return {
    target_name: o.target_name,
    ra_deg: String(o.ra_deg),
    dec_deg: String(o.dec_deg),
    date: o.date.slice(0, 16),
    location: o.location ?? "",
    telescope: o.telescope ?? "",
    eyepiece: o.eyepiece ?? "",
    seeing: o.seeing ? String(o.seeing) : "",
    transparency: o.transparency ? String(o.transparency) : "",
    notes: o.notes ?? "",
    photo_url: o.photo_url ?? "",
  };
}

export function ObservationLogPanel({ scene, searchIndex }: Props) {
  const enabled = useExtraLayerEnabled(LAYER_ID);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [observations, setObservations] = useState<ReadonlyArray<Observation>>(
    () => listObservations(),
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [targetQuery, setTargetQuery] = useState("");
  const [targetSuggestions, setTargetSuggestions] = useState<SearchEntry[]>([]);
  const [importNote, setImportNote] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = subscribeStore((list) => setObservations(list));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Update target suggestions when the user types.
  useEffect(() => {
    if (!searchIndex || !targetQuery || targetQuery.length < 2) {
      setTargetSuggestions([]);
      return;
    }
    const hits = searchIndex.search(targetQuery, 5);
    setTargetSuggestions(hits);
  }, [targetQuery, searchIndex]);

  if (!enabled) return null;

  const startAdd = () => {
    setForm({
      ...EMPTY_FORM,
      date: nowLocalIso(),
    });
    setTargetQuery("");
    setMode({ kind: "add" });
  };

  const startEdit = (o: Observation) => {
    setForm(obsToForm(o));
    setTargetQuery(o.target_name);
    setMode({ kind: "edit", id: o.id });
  };

  const cancelForm = () => {
    setMode({ kind: "list" });
    setForm(EMPTY_FORM);
    setTargetQuery("");
  };

  const submitForm = () => {
    const ra = Number(form.ra_deg);
    const dec = Number(form.dec_deg);
    if (
      !form.target_name.trim() ||
      !Number.isFinite(ra) ||
      !Number.isFinite(dec) ||
      ra < 0 ||
      ra >= 360 ||
      dec < -90 ||
      dec > 90 ||
      !form.date
    ) {
      return;
    }
    const isoDate = (() => {
      // datetime-local is in the user's TZ; preserve as a local-ISO so
      // imports/exports round-trip unambiguously.
      const d = new Date(form.date);
      if (Number.isNaN(d.getTime())) return new Date().toISOString();
      return d.toISOString();
    })();
    const payload = {
      target_name: form.target_name.trim(),
      ra_deg: ra,
      dec_deg: dec,
      date: isoDate,
      location: form.location.trim() || undefined,
      telescope: form.telescope.trim() || undefined,
      eyepiece: form.eyepiece.trim() || undefined,
      seeing: parseSeeing(form.seeing),
      transparency: parseSeeing(form.transparency),
      notes: form.notes.trim() || undefined,
      photo_url: form.photo_url.trim() || undefined,
    };
    if (mode.kind === "edit") {
      updateObservation(mode.id, payload);
    } else {
      addObservation(payload);
    }
    cancelForm();
  };

  const deleteEntry = (id: string) => {
    if (mode.kind === "edit" && mode.id === id) setMode({ kind: "list" });
    deleteObservation(id);
  };

  const onPickTarget = (entry: SearchEntry) => {
    setForm((f) => ({
      ...f,
      target_name: entry.label,
      ra_deg: entry.raDeg !== undefined ? String(entry.raDeg) : f.ra_deg,
      dec_deg: entry.decDeg !== undefined ? String(entry.decDeg) : f.dec_deg,
    }));
    setTargetQuery(entry.label);
    setTargetSuggestions([]);
  };

  const flyToObservation = (o: Observation) => {
    if (!scene) return;
    const raRad = (o.ra_deg * Math.PI) / 180;
    const decRad = (o.dec_deg * Math.PI) / 180;
    const cdec = Math.cos(decRad);
    const x = cdec * Math.cos(raRad);
    const y = cdec * Math.sin(raRad);
    const z = Math.sin(decRad);
    scene.flyTo(new Vector3(x, z, -y).normalize(), 1200);
  };

  const onExportJson = () => {
    const json = exportJson();
    downloadFile("observation-log.json", "application/json", json);
  };

  const onExportCsv = () => {
    const csv = exportCsv();
    downloadFile("observation-log.csv", "text/csv;charset=utf-8", csv);
  };

  const onImportClick = () => {
    fileInputRef.current?.click();
  };

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text =
        typeof reader.result === "string"
          ? reader.result
          : new TextDecoder().decode(reader.result as ArrayBuffer);
      const { imported, skipped } = importJson(text, "merge");
      setImportNote(`Imported ${imported} · skipped ${skipped}`);
      window.setTimeout(() => setImportNote(null), 4000);
    };
    reader.onerror = () => {
      log.warn("[obs-log] import read failed", reader.error);
      setImportNote("Import failed");
      window.setTimeout(() => setImportNote(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto relative flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-space-950/70 px-2 py-1 backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Observation log"
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-amber-100 transition hover:bg-amber-300/15"
      >
        <span aria-hidden>📒</span>
        <span className="hidden sm:inline">log</span>
        <span className="font-mono text-[9px] text-white/50">
          {observations.length}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Observation log"
          className="absolute right-0 top-9 z-30 w-[min(420px,94vw)] max-h-[80vh] overflow-hidden rounded-lg border border-white/10 bg-space-950/95 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span aria-hidden>📒</span>
              <div className="font-display text-sm text-white/90">
                Observation log
              </div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-white/35">
                {observations.length} entries
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[calc(80vh-3rem)] overflow-y-auto p-3">
            {mode.kind === "list" && (
              <ListView
                observations={observations}
                onAdd={startAdd}
                onEdit={startEdit}
                onDelete={deleteEntry}
                onFlyTo={flyToObservation}
                onExportJson={onExportJson}
                onExportCsv={onExportCsv}
                onImportClick={onImportClick}
                importNote={importNote}
              />
            )}
            {(mode.kind === "add" || mode.kind === "edit") && (
              <FormView
                mode={mode.kind}
                form={form}
                setForm={setForm}
                targetQuery={targetQuery}
                setTargetQuery={setTargetQuery}
                targetSuggestions={targetSuggestions}
                onPickTarget={onPickTarget}
                onCancel={cancelForm}
                onSubmit={submitForm}
                hasSearchIndex={!!searchIndex}
              />
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

type ListProps = {
  observations: ReadonlyArray<Observation>;
  onAdd: () => void;
  onEdit: (o: Observation) => void;
  onDelete: (id: string) => void;
  onFlyTo: (o: Observation) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImportClick: () => void;
  importNote: string | null;
};

function ListView(props: ListProps) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={props.onAdd}
          className="rounded-md border border-amber-300/40 bg-amber-300/15 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-100 transition hover:bg-amber-300/25"
        >
          + observation
        </button>
        <div className="grow" />
        <button
          type="button"
          onClick={props.onExportJson}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/70 transition hover:bg-white/10"
          title="Download as JSON"
        >
          ⤓ json
        </button>
        <button
          type="button"
          onClick={props.onExportCsv}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/70 transition hover:bg-white/10"
          title="Download as CSV"
        >
          ⤓ csv
        </button>
        <button
          type="button"
          onClick={props.onImportClick}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/70 transition hover:bg-white/10"
          title="Import from JSON"
        >
          ⤒ import
        </button>
      </div>

      {props.importNote && (
        <div className="mb-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 font-mono text-[10px] text-emerald-100">
          {props.importNote}
        </div>
      )}

      {props.observations.length === 0 ? (
        <div className="py-6 text-center font-mono text-[11px] text-white/50">
          No observations yet. Press "+ observation" to log your first.
          <br />
          Stored locally — nothing leaves your browser.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {props.observations.map((o) => (
            <li
              key={o.id}
              className="group rounded-md border border-white/10 bg-white/[0.025] p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 grow">
                  <div className="truncate font-display text-[12px] text-white/90">
                    {o.target_name}
                  </div>
                  <div className="font-mono text-[9.5px] text-white/45">
                    {new Date(o.date).toLocaleString()}
                    {o.telescope ? ` · ${o.telescope}` : ""}
                    {o.location ? ` · ${o.location}` : ""}
                  </div>
                  <div className="font-mono text-[9.5px] text-white/35">
                    RA {o.ra_deg.toFixed(2)}° · Dec {o.dec_deg.toFixed(2)}°
                    {o.seeing ? ` · seeing ${o.seeing}/5` : ""}
                  </div>
                  {o.notes && (
                    <div className="mt-1 max-h-12 overflow-hidden text-[11px] text-white/65">
                      {o.notes}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => props.onFlyTo(o)}
                    title="Fly camera to this target"
                    className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-300/20"
                  >
                    ↗ fly
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => props.onEdit(o)}
                      title="Edit entry"
                      className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/70 transition hover:bg-white/10"
                    >
                      edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete "${o.target_name}"?`)) {
                          props.onDelete(o.id);
                        }
                      }}
                      title="Delete entry"
                      className="rounded-md border border-rose-400/30 bg-rose-400/10 px-1.5 py-0.5 font-mono text-[9px] text-rose-200 transition hover:bg-rose-400/20"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type FormProps = {
  mode: "add" | "edit";
  form: FormState;
  setForm: (f: FormState | ((prev: FormState) => FormState)) => void;
  targetQuery: string;
  setTargetQuery: (q: string) => void;
  targetSuggestions: SearchEntry[];
  onPickTarget: (e: SearchEntry) => void;
  onCancel: () => void;
  onSubmit: () => void;
  hasSearchIndex: boolean;
};

function FormView(props: FormProps) {
  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    props.setForm((f) => ({ ...f, [key]: v }));
  const labelCls = "font-mono text-[9.5px] uppercase tracking-widest text-white/45";
  const inputCls =
    "w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/85 placeholder-white/30 focus:border-amber-300/40 focus:bg-white/[0.07] focus:outline-none";
  const fieldValid = useMemo(() => {
    const ra = Number(props.form.ra_deg);
    const dec = Number(props.form.dec_deg);
    return (
      !!props.form.target_name.trim() &&
      Number.isFinite(ra) &&
      ra >= 0 &&
      ra < 360 &&
      Number.isFinite(dec) &&
      dec >= -90 &&
      dec <= 90 &&
      !!props.form.date
    );
  }, [props.form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
      className="space-y-2"
    >
      <div>
        <div className={labelCls}>Target</div>
        <input
          type="text"
          required
          value={props.form.target_name}
          onChange={(e) => {
            set("target_name", e.target.value);
            props.setTargetQuery(e.target.value);
          }}
          placeholder={props.hasSearchIndex ? "M31, Vega, NGC 2237 ..." : "Free text"}
          className={inputCls}
        />
        {props.targetSuggestions.length > 0 && (
          <ul className="mt-1 max-h-32 overflow-y-auto rounded-md border border-white/10 bg-space-900/80">
            {props.targetSuggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => props.onPickTarget(s)}
                  className="block w-full px-2 py-1 text-left font-mono text-[10px] text-white/80 transition hover:bg-amber-300/15"
                >
                  <div className="font-display text-[11px] text-white/90">
                    {s.label}
                  </div>
                  <div className="text-[9px] text-white/45">{s.detail}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label>
          <div className={labelCls}>RA (deg)</div>
          <input
            type="number"
            required
            min={0}
            max={360}
            step="any"
            value={props.form.ra_deg}
            onChange={(e) => set("ra_deg", e.target.value)}
            className={inputCls}
          />
        </label>
        <label>
          <div className={labelCls}>Dec (deg)</div>
          <input
            type="number"
            required
            min={-90}
            max={90}
            step="any"
            value={props.form.dec_deg}
            onChange={(e) => set("dec_deg", e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <label>
        <div className={labelCls}>Date / time</div>
        <input
          type="datetime-local"
          required
          value={props.form.date}
          onChange={(e) => set("date", e.target.value)}
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label>
          <div className={labelCls}>Location</div>
          <input
            type="text"
            value={props.form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Bortle 4 backyard"
            className={inputCls}
          />
        </label>
        <label>
          <div className={labelCls}>Telescope</div>
          <input
            type="text"
            value={props.form.telescope}
            onChange={(e) => set("telescope", e.target.value)}
            placeholder='10" Dobsonian'
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label>
          <div className={labelCls}>Eyepiece</div>
          <input
            type="text"
            value={props.form.eyepiece}
            onChange={(e) => set("eyepiece", e.target.value)}
            placeholder="25mm Plossl"
            className={inputCls}
          />
        </label>
        <label>
          <div className={labelCls}>Seeing</div>
          <select
            value={props.form.seeing}
            onChange={(e) => set("seeing", e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            <option value="1">1 (perfect)</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5 (terrible)</option>
          </select>
        </label>
        <label>
          <div className={labelCls}>Transparency</div>
          <select
            value={props.form.transparency}
            onChange={(e) => set("transparency", e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            <option value="1">1 (excellent)</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5 (hazy)</option>
          </select>
        </label>
      </div>

      <label>
        <div className={labelCls}>Notes (markdown)</div>
        <textarea
          value={props.form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="What did it look like?"
          className={`${inputCls} resize-y`}
        />
      </label>

      <label>
        <div className={labelCls}>Astrophoto URL (optional)</div>
        <input
          type="url"
          value={props.form.photo_url}
          onChange={(e) => set("photo_url", e.target.value)}
          placeholder="https://..."
          className={inputCls}
        />
      </label>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={props.onCancel}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:bg-white/10"
        >
          cancel
        </button>
        <button
          type="submit"
          disabled={!fieldValid}
          className="rounded-md border border-amber-300/40 bg-amber-300/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-100 transition hover:bg-amber-300/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {props.mode === "edit" ? "save" : "log it"}
        </button>
      </div>
    </form>
  );
}

function downloadFile(name: string, type: string, content: string): void {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    log.warn("[obs-log] download failed", err);
  }
}
