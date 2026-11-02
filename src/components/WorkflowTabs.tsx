import React from 'react';

export type AppStage = 'prepare' | 'sing' | 'review';

interface WorkflowTabsProps {
  stage: AppStage;
  disabled: boolean;
  hasTakes: boolean;
  onChange: (stage: AppStage) => void;
}

const steps: { id: AppStage; label: string; detail: string }[] = [
  { id: 'prepare', label: '準備', detail: '伴奏與歌詞' },
  { id: 'sing', label: '開唱', detail: '錄製人聲' },
  { id: 'review', label: '後製', detail: '混音與匯出' },
];

export const WorkflowTabs: React.FC<WorkflowTabsProps> = ({ stage, disabled, hasTakes, onChange }) => (
  <nav className="workflow-tabs" aria-label="錄音流程">
    {steps.map((step, index) => (
      <React.Fragment key={step.id}>
        {index > 0 && <span className="workflow-step-connector" aria-hidden="true" />}
        <button
          className={`workflow-tab${stage === step.id ? ' active' : ''}${index < steps.findIndex(item => item.id === stage) ? ' complete' : ''}`}
          type="button"
          onClick={() => onChange(step.id)}
          disabled={disabled || (step.id === 'review' && !hasTakes)}
          aria-current={stage === step.id ? 'step' : undefined}
        >
          <span className="workflow-step-number">{index < steps.findIndex(item => item.id === stage) ? '✓' : index + 1}</span>
          <span className="workflow-step-copy">
            <span className="workflow-step-label">{step.label}</span>
            <span className="workflow-step-detail">{step.detail}</span>
          </span>
        </button>
      </React.Fragment>
    ))}
  </nav>
);
