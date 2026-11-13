import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type FieldTree, FormField } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import type { SkillSummary } from '@selvedge/contracts';

@Component({
  selector: 'app-review-skill-picker',
  imports: [FormField, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skill-row">
      <label for="review-skill"
        >Review skill
        <select id="review-skill" [formField]="field()">
          @for (skill of skills(); track skill.id) {
            <option [value]="skill.id">{{ skill.name }}</option>
          }
        </select>
      </label>
      <p-button
        size="small"
        label="Import SKILL.md"
        severity="secondary"
        [disabled]="busy()"
        (onClick)="importRequested.emit()"
      />
    </div>
    <p>
      Edit your SKILL.md externally and import it again to update. Instructions only; linked
      resources and scripts are not loaded.
    </p>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 12px;
    }
    .skill-row {
      display: flex;
      align-items: end;
      gap: 12px;
      flex-wrap: wrap;
    }
    label {
      display: grid;
      gap: 5px;
      font-size: 11px;
      flex: 1;
      min-width: 100px;
    }
    p {
      color: var(--selvedge-muted);
      font-size: 11px;
      line-height: 1.6;
      margin: 6px 0 12px;
    }
  `,
})
export class ReviewSkillPicker {
  readonly field = input.required<FieldTree<string>>();
  readonly skills = input<SkillSummary[]>([]);
  readonly busy = input(false);
  readonly importRequested = output();
}
