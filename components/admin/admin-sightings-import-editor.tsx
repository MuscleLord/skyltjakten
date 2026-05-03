"use client";

import { useMemo, useState } from "react";
import { ConfirmActionButton } from "@/components/confirm-action-button";

type Source = "existing" | "csv" | "manual";

type CsvImportMode = "append" | "replaceMatching" | "replaceAll";

type InitialRow = {
  id: string;
  target: string;
  foundAt: string;
  source: Source;
};

type DraftRow = {
  id: string;
  target: string;
  foundAtLocal: string;
  source: Source;
};

type AdminSightingsImportEditorProps = {
  targetUserId: string;
  initialRows: InitialRow[];
  action: (formData: FormData) => void | Promise<void>;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    "-",
    pad2(date.getMonth() + 1),
    "-",
    pad2(date.getDate()),
    "T",
    pad2(date.getHours()),
    ":",
    pad2(date.getMinutes()),
  ].join("");
}

function normalizeTarget(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  return digits.padStart(3, "0").slice(-3);
}

function createRow(source: Source): DraftRow {
  return {
    id: crypto.randomUUID(),
    target: "",
    foundAtLocal: "",
    source,
  };
}

function parseCsv(text: string): DraftRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes("target") ||
    firstLine.includes("nummer") ||
    firstLine.includes("found") ||
    firstLine.includes("datum");

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map((line) => {
      const parts = line.split(/[;,|\t]/).map((part) => part.trim());

      const target = normalizeTarget(parts[0] ?? "");
      const dateValue = parts[1] ?? "";

      return {
        id: crypto.randomUUID(),
        target,
        foundAtLocal: dateValue.includes("T")
          ? dateValue.slice(0, 16)
          : dateValue.replace(" ", "T").slice(0, 16),
        source: "csv" as const,
      };
    })
    .filter((row) => row.target || row.foundAtLocal);
}

function validateRows(rows: DraftRow[]): string[] {
  const errors: string[] = [];

  const normalized = rows
    .map((row) => ({
      ...row,
      target: normalizeTarget(row.target),
    }))
    .sort((a, b) => a.target.localeCompare(b.target));

  const seen = new Set<string>();

  for (let i = 0; i < normalized.length; i++) {
    const row = normalized[i];
    const expected = String(i + 1).padStart(3, "0");

    if (!/^\d{3}$/.test(row.target)) {
      errors.push(`Rad ${i + 1}: ogiltigt nummer.`);
      continue;
    }

    if (row.target !== expected) {
      errors.push(
        `Numren måste vara sammanhängande. Förväntade ${expected}, fick ${row.target}.`
      );
    }

    if (seen.has(row.target)) {
      errors.push(`Nummer ${row.target} finns flera gånger.`);
    }

    seen.add(row.target);

    if (!row.foundAtLocal) {
      errors.push(`Nummer ${row.target}: datum saknas.`);
      continue;
    }

    const date = new Date(row.foundAtLocal);

    if (Number.isNaN(date.getTime())) {
      errors.push(`Nummer ${row.target}: ogiltigt datum.`);
      continue;
    }

    if (date.getTime() > Date.now() + 5 * 60 * 1000) {
      errors.push(`Nummer ${row.target}: datum ligger i framtiden.`);
    }

    if (i > 0) {
      const previous = new Date(normalized[i - 1].foundAtLocal);

      if (!Number.isNaN(previous.getTime()) && date.getTime() < previous.getTime()) {
        errors.push(
          `Nummer ${row.target}: datumet är tidigare än föregående nummer.`
        );
      }
    }
  }

  return errors;
}

function sourceLabel(source: Source): string {
  if (source === "existing") return "befintlig";
  if (source === "csv") return "csv";
  return "manuell";
}

export function AdminSightingsImportEditor({
  targetUserId,
  initialRows,
  action,
}: AdminSightingsImportEditorProps) {
  const [rows, setRows] = useState<DraftRow[]>(
    initialRows.map((row) => ({
      id: row.id,
      target: row.target,
      foundAtLocal: toDateTimeLocalValue(row.foundAt),
      source: row.source,
    }))
  );

  const [csvText, setCsvText] = useState("");

  const [csvImportMode, setCsvImportMode] = useState<CsvImportMode>("append");

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) =>
      normalizeTarget(a.target).localeCompare(normalizeTarget(b.target))
    );
  }, [rows]);

  const errors = useMemo(() => validateRows(sortedRows), [sortedRows]);

  const rowsForSubmit = useMemo(() => {
    return sortedRows.map((row) => ({
      target: normalizeTarget(row.target),
      foundAt: new Date(row.foundAtLocal).toISOString(),
    }));
  }, [sortedRows]);

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function addManualRow() {
    setRows((current) => [...current, createRow("manual")]);
  }
  
  /*
  function addCsvRows() {
    const parsed = parseCsv(csvText);

    if (parsed.length === 0) return;

    setRows((current) => [...current, ...parsed]);
    setCsvText("");
  }*/

  function addCsvRows() {
    const parsed = parseCsv(csvText);

    if (parsed.length === 0) return;

    if (csvImportMode === "append") {
        setRows((current) => [...current, ...parsed]);
        setCsvText("");
        return;
    }

    if (csvImportMode === "replaceMatching") {
        const parsedTargets = new Set(parsed.map((row) => normalizeTarget(row.target)));

        setRows((current) => [
        ...current.filter((row) => !parsedTargets.has(normalizeTarget(row.target))),
        ...parsed,
        ]);

        setCsvText("");
        return;
    }

    if (csvImportMode === "replaceAll") {
        const confirmed = window.confirm(
            "Detta rensar hela staging-tabellen och ersätter den med CSV-raderna. Fortsätta?"
        );

        if (!confirmed) return;
        setRows(parsed);
        setCsvText("");
    }
  }

  function applyCsvRows() {
    const parsed = parseCsv(csvText);

    if (parsed.length === 0) return;

    if (csvImportMode === "append") {
        setRows((current) => [...current, ...parsed]);
        setCsvText("");
        return;
    }

    if (csvImportMode === "replaceMatching") {
        const parsedTargets = new Set(
        parsed.map((row) => normalizeTarget(row.target))
        );

        setRows((current) => [
        ...current.filter(
            (row) => !parsedTargets.has(normalizeTarget(row.target))
        ),
        ...parsed,
        ]);

        setCsvText("");
        return;
  }

  setRows(parsed);
  setCsvText("");
}

  function normalizeAndSortRows() {
    setRows((current) =>
      [...current]
        .map((row) => ({
          ...row,
          target: normalizeTarget(row.target),
        }))
        .sort((a, b) => a.target.localeCompare(b.target))
    );
  }

  const nextTarget =
    sortedRows.length >= 999
      ? "Klar"
      : String(sortedRows.length + 1).padStart(3, "0");

  return (
    <section className="mt-6 rounded-3xl border border-sky-400/20 bg-[#0e1b38]/90 p-5 shadow-xl shadow-blue-950/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Staging</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Det som ligger i tabellen nedan blir användarens nya progress.
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Rader: {sortedRows.length} · Nästa mål: {nextTarget}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addManualRow}
            className="nav-button"
          >
            Lägg till rad
          </button>

          <button
            type="button"
            onClick={normalizeAndSortRows}
            className="nav-button"
          >
            Sortera/normalisera
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-sky-900/60 bg-blue-950/30 p-4">
        <h3 className="font-semibold">CSV-import</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Format: <code>target,found_at</code>. Exempel:{" "}
          <code>001,2026-05-01 14:32</code>
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
        <label className="flex has-checked:bg-sky-700/30 has-checked:scale-[1.02] has-checked:shadow-md has-checked:shadow-sky-500/15 cursor-pointer items-start gap-2 rounded-xl border border-sky-900/60 bg-blue-950/30 p-3 text-sm">
            <input
            type="radio"
            name="csvImportMode"
            value="append"
            checked={csvImportMode === "append"}
            onChange={() => setCsvImportMode("append")}
            className="mt-1"
            />
            <span>
            <span className="block font-semibold text-slate-100">
                Lägg till
            </span>
            <span className="block text-zinc-400">
                CSV-rader läggs ovanpå befintlig staging. Dubbletter måste lösas manuellt.
            </span>
            </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-sky-900/60 bg-blue-950/30 p-3 text-sm has-checked:bg-sky-700/30 has-checked:scale-[1.02] has-checked:shadow-md has-checked:shadow-sky-500/15">
            <input
            type="radio"
            name="csvImportMode"
            value="replaceMatching"
            checked={csvImportMode === "replaceMatching"}
            onChange={() => setCsvImportMode("replaceMatching")}
            className="mt-1"
            />
            <span>
            <span className="block font-semibold text-slate-100">
                Ersätt matchande
            </span>
            <span className="block text-zinc-400">
                Om CSV innehåller 001 ersätts staging-raden 001, men andra rader behålls.
            </span>
            </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/20 p-3 text-sm has-checked:bg-red-600/20 has-checked:scale-[1.02] has-checked:shadow-md has-checked:shadow-red-400/15">
            <input
            type="radio"
            name="csvImportMode"
            value="replaceAll"
            checked={csvImportMode === "replaceAll"}
            onChange={() => setCsvImportMode("replaceAll")}
            className="mt-1"
            />
            <span>
            <span className="block font-semibold text-red-100">
                Rensa och importera
            </span>
            <span className="block text-red-200/80">
                Tar bort all staging och använder bara CSV-raderna.
            </span>
            </span>
        </label>
        </div>
        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          rows={6}
          className="mt-3 w-full rounded-xl border-2 border-zinc-700 bg-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-amber-400"
          placeholder={"target,found_at\n001,2026-05-01 14:32\n002,2026-05-02 09:10"}
        />
        {csvImportMode === "replaceAll" ? (
            <ConfirmActionButton
                onConfirm={applyCsvRows}
                title="Rensa staging och importera CSV?"
                description="Detta tar bort alla rader som just nu ligger i staging-tabellen och ersätter dem med CSV-raderna. Databasen påverkas inte förrän du klickar Ersätt progress."
                confirmLabel="Ja, rensa staging"
                variant="danger"
                disabled={csvText.trim().length === 0}
                buttonClassName="mt-3 rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-400 hover:scale-[1.05] duration-300 disabled:cursor-not-allowed active:scale-[0.97] active:bg-red-400/80 disabled:opacity-60 active:inset-shadow-2xl active:shadow-inner active:shadow-black/90"
            >
                Rensa staging och importera
            </ConfirmActionButton>
            ) : (
            <button
                type="button"
                onClick={applyCsvRows}
                disabled={csvText.trim().length === 0}
                className="mt-3 rounded-2xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 active:inset-shadow-2xl active:shadow-inner active:shadow-black/90 primary-yellow-button"
            >
                {csvImportMode === "append" && "Lägg till CSV-rader"}
                {csvImportMode === "replaceMatching" && "Ersätt matchande rader"}
            </button>
        )}
      
      </div>

      {errors.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
          <p className="font-semibold">Datan är inte konsekvent:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.slice(0, 8).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>

          {errors.length > 8 && (
            <p className="mt-2">+ {errors.length - 8} fler fel.</p>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-190 border-collapse text-sm">
          <thead>
            <tr className="border-b border-sky-900/60 text-left text-zinc-400">
              <th className="py-3 pr-4">Nummer</th>
              <th className="py-3 pr-4">Tidpunkt</th>
              <th className="py-3 pr-4">Källa</th>
              <th className="py-3 pr-4"></th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-zinc-400">
                  Inga rader i staging. Lägg till manuellt eller importera CSV.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.id} className="border-b border-sky-950/70">
                  <td className="py-3 pr-4">
                    <input
                      value={row.target}
                      onChange={(event) =>
                        updateRow(row.id, { target: event.target.value })
                      }
                      className="w-24 rounded-lg border-2 border-zinc-700 bg-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-amber-400"
                    />
                  </td>

                  <td className="py-3 pr-4">
                    <input
                      type="datetime-local"
                      value={row.foundAtLocal}
                      onChange={(event) =>
                        updateRow(row.id, { foundAtLocal: event.target.value })
                      }
                      className="rounded-lg border-2 border-zinc-700 bg-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-amber-400"
                    />
                  </td>

                  <td className="py-3 pr-4 text-zinc-300">
                    {sourceLabel(row.source)}
                  </td>

                  <td className="py-3 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded-lg border bg-red-950/40 border-red-500/50 px-3 py-2 text-sm text-red-100 hover:bg-red-800/40 hover:scale-[1.05] duration-300 active:bg-red-400/50 active:scale-[0.97] active:duration-300"
                    >
                      Ta bort
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form className="mt-6">
        <input type="hidden" name="targetUserId" value={targetUserId} />
        <input
          type="hidden"
          name="rowsJson"
          value={JSON.stringify(rowsForSubmit)}
        />

        <ConfirmActionButton
          action={action}
          title="Ersätt användarens progress?"
          description={`Detta raderar användarens befintliga sightings för standardutmaningen och ersätter dem med ${sortedRows.length} validerade rader från staging-tabellen.`}
          confirmLabel="Ja, ersätt progress"
          variant="danger"
          hiddenFields={{
            targetUserId,
            rowsJson: JSON.stringify(rowsForSubmit),
          }}
          buttonClassName="w-full rounded-2xl bg-red-500 px-5 py-4 text-lg font-black text-white shadow-lg active:inset-shadow-2xl active:shadow-inner active:shadow-black/90 shadow-red-950/30 hover:bg-red-400 active:bg-red-400/80 active:scale-[0.98] hover:scale-[1.01] duration-300 disabled:opacity-60"
        >
          Ersätt progress
        </ConfirmActionButton>
      </form>
    </section>
  );
}