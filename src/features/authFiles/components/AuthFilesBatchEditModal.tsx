import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { AuthFileFieldsPatch } from '@/services/api';
import { parsePriorityValue } from '@/features/authFiles/constants';
import styles from '@/pages/AuthFilesPage.module.scss';

type BatchFieldKey = 'prefix' | 'proxyUrl' | 'priority' | 'headers' | 'note';

type BatchFieldToggles = Record<BatchFieldKey, boolean>;

export type AuthFilesBatchEditPayload = {
  patch: AuthFileFieldsPatch;
  addTags: string[];
  removeTags: string[];
};

export type AuthFilesBatchEditModalProps = {
  open: boolean;
  selectedCount: number;
  disabled: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: AuthFilesBatchEditPayload) => boolean | Promise<boolean>;
};

const INITIAL_FIELDS: BatchFieldToggles = {
  prefix: false,
  proxyUrl: false,
  priority: false,
  headers: false,
  note: false,
};

const splitTagList = (value: string): string[] => {
  const seen = new Set<string>();
  const tags: string[] = [];
  value
    .split(/[\n,，]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      if (seen.has(tag)) return;
      seen.add(tag);
      tags.push(tag);
    });
  return tags;
};

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function AuthFilesBatchEditModal(props: AuthFilesBatchEditModalProps) {
  const { t } = useTranslation();
  const { open, selectedCount, disabled, saving, onClose, onSave } = props;

  const [fields, setFields] = useState<BatchFieldToggles>(INITIAL_FIELDS);
  const [prefix, setPrefix] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [priority, setPriority] = useState('');
  const [headersText, setHeadersText] = useState('');
  const [note, setNote] = useState('');
  const [addTagsText, setAddTagsText] = useState('');
  const [removeTagsText, setRemoveTagsText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFields(INITIAL_FIELDS);
    setPrefix('');
    setProxyUrl('');
    setPriority('');
    setHeadersText('');
    setNote('');
    setAddTagsText('');
    setRemoveTagsText('');
    setFormError(null);
  };

  const addTags = useMemo(() => splitTagList(addTagsText), [addTagsText]);
  const removeTags = useMemo(() => splitTagList(removeTagsText), [removeTagsText]);

  const hasWork =
    fields.prefix ||
    fields.proxyUrl ||
    fields.priority ||
    fields.note ||
    (fields.headers && headersText.trim().length > 0) ||
    addTags.length > 0 ||
    removeTags.length > 0;
  const hasFieldWork =
    fields.prefix ||
    fields.proxyUrl ||
    fields.priority ||
    fields.note ||
    (fields.headers && headersText.trim().length > 0);
  const canSave = hasWork && (!disabled || !hasFieldWork);

  const toggleField = (field: BatchFieldKey, checked: boolean) => {
    setFields((current) => ({ ...current, [field]: checked }));
    setFormError(null);
  };

  const buildPayload = (): AuthFilesBatchEditPayload | null => {
    const patch: AuthFileFieldsPatch = {};

    if (fields.prefix) {
      patch.prefix = prefix.trim();
    }
    if (fields.proxyUrl) {
      patch.proxy_url = proxyUrl.trim();
    }
    if (fields.priority) {
      const priorityText = priority.trim();
      if (!priorityText) {
        patch.priority = 0;
      } else {
        const parsedPriority = parsePriorityValue(priorityText);
        if (parsedPriority === undefined) {
          setFormError(t('auth_files.batch_edit_priority_invalid'));
          return null;
        }
        patch.priority = parsedPriority;
      }
    }
    if (fields.note) {
      patch.note = note.trim();
    }
    if (fields.headers && headersText.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(headersText) as unknown;
      } catch {
        setFormError(t('auth_files.headers_invalid_json'));
        return null;
      }
      if (!isRecordObject(parsed)) {
        setFormError(t('auth_files.headers_invalid_object'));
        return null;
      }

      const headers: Record<string, string> = {};
      for (const [rawName, rawValue] of Object.entries(parsed)) {
        const name = rawName.trim();
        if (!name) continue;
        if (typeof rawValue !== 'string') {
          setFormError(t('auth_files.headers_invalid_value'));
          return null;
        }
        headers[name] = rawValue.trim();
      }
      if (Object.keys(headers).length > 0) {
        patch.headers = headers;
      }
    }

    const payload: AuthFilesBatchEditPayload = {
      patch,
      addTags,
      removeTags,
    };

    if (
      Object.keys(payload.patch).length === 0 &&
      payload.addTags.length === 0 &&
      payload.removeTags.length === 0
    ) {
      setFormError(t('auth_files.batch_edit_no_changes'));
      return null;
    }

    return payload;
  };

  const handleSave = async () => {
    setFormError(null);
    const payload = buildPayload();
    if (!payload) return;
    const saved = await onSave(payload);
    if (saved) {
      resetForm();
    }
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose();
  };

  const fieldDisabled = disabled || saving;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeDisabled={saving}
      width={760}
      title={t('auth_files.batch_edit_title', { count: selectedCount })}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} loading={saving} disabled={!canSave}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className={styles.batchEditModal}>
        {formError && <div className={styles.prefixProxyError}>{formError}</div>}

        <div className={styles.batchEditSection}>
          <div className={styles.batchEditSectionTitle}>
            {t('auth_files.batch_edit_fields_title')}
          </div>
          <div className={styles.batchEditFieldGrid}>
            <div className={styles.batchEditField}>
              <label className={styles.batchEditToggle}>
                <input
                  type="checkbox"
                  checked={fields.prefix}
                  disabled={fieldDisabled}
                  onChange={(event) => toggleField('prefix', event.currentTarget.checked)}
                />
                <span>{t('auth_files.batch_edit_enable_prefix')}</span>
              </label>
              <Input
                label={t('auth_files.prefix_label')}
                value={prefix}
                disabled={fieldDisabled || !fields.prefix}
                placeholder={t('auth_files.prefix_placeholder')}
                onChange={(event) => setPrefix(event.currentTarget.value)}
              />
            </div>

            <div className={styles.batchEditField}>
              <label className={styles.batchEditToggle}>
                <input
                  type="checkbox"
                  checked={fields.proxyUrl}
                  disabled={fieldDisabled}
                  onChange={(event) => toggleField('proxyUrl', event.currentTarget.checked)}
                />
                <span>{t('auth_files.batch_edit_enable_proxy_url')}</span>
              </label>
              <Input
                label={t('auth_files.proxy_url_label')}
                value={proxyUrl}
                disabled={fieldDisabled || !fields.proxyUrl}
                placeholder={t('auth_files.proxy_url_placeholder')}
                onChange={(event) => setProxyUrl(event.currentTarget.value)}
              />
            </div>

            <div className={styles.batchEditField}>
              <label className={styles.batchEditToggle}>
                <input
                  type="checkbox"
                  checked={fields.priority}
                  disabled={fieldDisabled}
                  onChange={(event) => toggleField('priority', event.currentTarget.checked)}
                />
                <span>{t('auth_files.batch_edit_enable_priority')}</span>
              </label>
              <Input
                label={t('auth_files.priority_label')}
                value={priority}
                disabled={fieldDisabled || !fields.priority}
                placeholder={t('auth_files.priority_placeholder')}
                hint={t('auth_files.batch_edit_priority_hint')}
                onChange={(event) => setPriority(event.currentTarget.value)}
              />
            </div>

            <div className={styles.batchEditField}>
              <label className={styles.batchEditToggle}>
                <input
                  type="checkbox"
                  checked={fields.note}
                  disabled={fieldDisabled}
                  onChange={(event) => toggleField('note', event.currentTarget.checked)}
                />
                <span>{t('auth_files.batch_edit_enable_note')}</span>
              </label>
              <Input
                label={t('auth_files.note_label')}
                value={note}
                disabled={fieldDisabled || !fields.note}
                placeholder={t('auth_files.note_placeholder')}
                onChange={(event) => setNote(event.currentTarget.value)}
              />
            </div>
          </div>

          <div className={styles.batchEditField}>
            <label className={styles.batchEditToggle}>
              <input
                type="checkbox"
                checked={fields.headers}
                disabled={fieldDisabled}
                onChange={(event) => toggleField('headers', event.currentTarget.checked)}
              />
              <span>{t('auth_files.batch_edit_enable_headers')}</span>
            </label>
            <label className={styles.prefixProxyLabel} htmlFor="auth-files-batch-headers">
              {t('auth_files.headers_label')}
            </label>
            <textarea
              id="auth-files-batch-headers"
              className={styles.prefixProxyTextarea}
              value={headersText}
              disabled={fieldDisabled || !fields.headers}
              placeholder={t('auth_files.headers_placeholder')}
              rows={5}
              onChange={(event) => setHeadersText(event.currentTarget.value)}
            />
            <div className="hint">{t('auth_files.batch_edit_headers_hint')}</div>
          </div>
        </div>

        <div className={styles.batchEditSection}>
          <div className={styles.batchEditSectionTitle}>
            {t('auth_files.batch_edit_tags_title')}
          </div>
          <div className={styles.batchEditTagGrid}>
            <Input
              label={t('auth_files.batch_edit_add_tags_label')}
              value={addTagsText}
              disabled={saving}
              placeholder={t('auth_files.batch_edit_tags_placeholder')}
              onChange={(event) => setAddTagsText(event.currentTarget.value)}
            />
            <Input
              label={t('auth_files.batch_edit_remove_tags_label')}
              value={removeTagsText}
              disabled={saving}
              placeholder={t('auth_files.batch_edit_tags_placeholder')}
              onChange={(event) => setRemoveTagsText(event.currentTarget.value)}
            />
          </div>
          <div className="hint">{t('auth_files.batch_edit_tags_hint')}</div>
        </div>
      </div>
    </Modal>
  );
}
