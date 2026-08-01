"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { seedState } from "../../lib/seed";
import type { DealStage, PipelineStage, WorkspaceState } from "../../lib/types";

const editableStageIds: DealStage[] = ["new", "contacted", "proposal", "negotiation", "won"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [workspace, setWorkspace] = useState<WorkspaceState>(seedState);
  const [stages, setStages] = useState<PipelineStage[]>(() => seedState.pipelineStages.filter((stage) => editableStageIds.includes(stage.id)));
  const [draggedId, setDraggedId] = useState<DealStage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workspace")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((remote: WorkspaceState) => {
        const pipelineStages = remote.pipelineStages ?? seedState.pipelineStages;
        setWorkspace({ ...remote, pipelineStages });
        setStages(pipelineStages.filter((stage) => editableStageIds.includes(stage.id)));
      })
      .catch(() => undefined);
  }, []);

  function reorderStage(sourceId: DealStage, targetId: DealStage) {
    if (sourceId === targetId) return;
    setStages((current) => {
      const sourceIndex = current.findIndex((stage) => stage.id === sourceId);
      const targetIndex = current.findIndex((stage) => stage.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function moveStage(id: DealStage, offset: number) {
    setStages((current) => {
      const index = current.findIndex((stage) => stage.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function finishOnboarding() {
    setSaving(true);
    const lost = workspace.pipelineStages.find((stage) => stage.id === "lost") ?? { id: "lost" as const, name: "Програно" };
    const next = { ...workspace, pipelineStages: [...stages, lost] };
    const response = await fetch("/api/workspace", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => null);
    setSaving(false);
    if (response?.ok) router.push("/app/deals");
  }

  return <main className="onboarding">
    <header><Link href="/" className="brand"><span className="brand-mark">F</span><span>FlowDesk</span></Link><span>Крок {step} з 3</span></header>
    <div className="progress"><i style={{ width: `${step / 3 * 100}%` }} /></div>
    <section className="onboarding-card">
      {step === 1 ? <>
        <span className="step-icon">✦</span><span className="eyebrow">Почнемо з основи</span>
        <h1>Як називається ваша команда?</h1><p>Цю назву бачитимуть усі учасники робочого простору.</p>
        <label>Назва компанії<input value={workspace.workspace.name} onChange={(event) => setWorkspace({ ...workspace, workspace: { ...workspace.workspace, name: event.target.value } })} autoFocus /></label>
        <label>Сфера діяльності<select defaultValue="agency"><option value="agency">Digital-агенція</option><option>Консалтинг</option><option>Сервісна компанія</option><option>Інше</option></select></label>
      </> : null}
      {step === 2 ? <>
        <span className="step-icon">◎</span><span className="eyebrow">Налаштуйте процес</span>
        <h1>Який у вас цикл продажів?</h1><p>Перетягуйте етапи, змінюйте назви або використовуйте стрілки для нового порядку.</p>
        <div className="pipeline-setup">
          {stages.map((stage, index) => <div key={stage.id} draggable onDragStart={() => setDraggedId(stage.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => draggedId && reorderStage(draggedId, stage.id)}>
            <b>{index + 1}</b>
            <input aria-label={`Назва етапу ${index + 1}`} value={stage.name} onChange={(event) => setStages((current) => current.map((item) => item.id === stage.id ? { ...item, name: event.target.value } : item))} />
            <span className="stage-controls"><button type="button" onClick={() => moveStage(stage.id, -1)} disabled={index === 0} aria-label="Перемістити вище">↑</button><button type="button" onClick={() => moveStage(stage.id, 1)} disabled={index === stages.length - 1} aria-label="Перемістити нижче">↓</button><em title="Перетягнути">⠿</em></span>
          </div>)}
        </div>
      </> : null}
      {step === 3 ? <>
        <span className="step-icon">✓</span><span className="eyebrow">Усе готово</span>
        <h1>Ваш FlowDesk зібрано.</h1><p>Назви й порядок етапів збережуться в робочому pipeline.</p>
        <div className="ready-list"><span>✓ Робочий простір {workspace.workspace.name}</span><span>✓ Воронка: {stages.map((stage) => stage.name).join(" → ")}</span><span>✓ Демонстраційна команда та дані</span></div>
      </> : null}
      <div className="onboarding-actions">
        {step > 1 ? <button className="secondary" onClick={() => setStep(step - 1)}>← Назад</button> : null}
        {step < 3 ? <button className="primary" onClick={() => setStep(step + 1)} disabled={stages.some((stage) => !stage.name.trim())}>Продовжити →</button> : <button className="primary" onClick={finishOnboarding} disabled={saving}>{saving ? "Зберігаємо…" : "Зберегти й відкрити →"}</button>}
      </div>
    </section>
  </main>;
}
