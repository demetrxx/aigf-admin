import { GearIcon, RocketIcon, UploadIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

import {
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Container,
  Divider,
  Dropdown,
  EmptyState,
  Field,
  FormRow,
  Grid,
  IconButton,
  Input,
  List,
  Modal,
  Pagination,
  Popover,
  Progress,
  RadioGroup,
  Section,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Tabs,
  Tag,
  Textarea,
  Typography,
} from '@/atoms';
import { FileDir, type IFile } from '@/common/types';
import { FileUpload } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './UiKitPage.module.scss';

export function UiKitPage() {
  const [audience, setAudience] = useState('founders');
  const [tab, setTab] = useState('drafts');
  const [page, setPage] = useState(2);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuValue, setMenuValue] = useState('Preview');
  const [uploadedFile, setUploadedFile] = useState<IFile | null>(null);

  return (
    <AppShell>
      <div className={s.page}>
        <section className={s.section} aria-label="Buttons">
          <Typography variant="h3">Buttons</Typography>
          <div className={s.row}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="text">Text</Button>
          </div>
          <div className={s.row}>
            <Button tone="success">Success</Button>
            <Button tone="warning">Warning</Button>
            <Button tone="danger">Danger</Button>
            <Button loading>Loading</Button>
          </div>
          <div className={s.row}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button fullWidth>Full width</Button>
          </div>
        </section>

        <section className={s.section} aria-label="Icon buttons">
          <Typography variant="h3">Icon buttons</Typography>
          <div className={s.row}>
            <IconButton
              aria-label="Launch"
              icon={<RocketIcon />}
              tooltip="Launch"
            />
            <IconButton
              aria-label="Settings"
              icon={<GearIcon />}
              variant="secondary"
              tooltip="Settings"
            />
            <IconButton
              aria-label="Upload"
              icon={<UploadIcon />}
              variant="outline"
              tone="success"
              tooltip="Upload"
            />
            <IconButton
              aria-label="Loading"
              icon={<RocketIcon />}
              loading
              tooltip="Loading"
            />
          </div>
        </section>

        <section className={s.section} aria-label="Button groups">
          <Typography variant="h3">Button groups</Typography>
          <div className={s.stack}>
            <ButtonGroup>
              <Button variant="secondary">Left</Button>
              <Button variant="secondary">Center</Button>
              <Button variant="secondary">Right</Button>
            </ButtonGroup>
            <ButtonGroup attached>
              <Button variant="secondary">Day</Button>
              <Button variant="secondary">Week</Button>
              <Button variant="secondary">Month</Button>
            </ButtonGroup>
            <ButtonGroup attached orientation="vertical">
              <Button variant="secondary">Drafts</Button>
              <Button variant="secondary">Published</Button>
              <Button variant="secondary">Archived</Button>
            </ButtonGroup>
          </div>
        </section>

        <section className={s.section} aria-label="Forms">
          <Typography variant="h3">Form controls</Typography>
          <FormRow columns={2}>
            <Field
              label="Project name"
              hint="Visible inside your workspace."
              required
              labelFor="project-name"
            >
              <Input id="project-name" placeholder="AIgf" fullWidth />
            </Field>
            <Field label="Category" labelFor="project-category">
              <Select
                id="project-category"
                fullWidth
                defaultValue="writing"
                options={[
                  { label: 'Writing', value: 'writing' },
                  { label: 'Research', value: 'research' },
                  { label: 'Notes', value: 'notes' },
                ]}
              />
            </Field>
          </FormRow>
          <Field
            label="One-sentence summary"
            hint="Keep it calm and precise."
            labelFor="project-summary"
          >
            <Textarea
              id="project-summary"
              placeholder="A quiet space for drafts."
            />
          </Field>
          <FormRow columns={2}>
            <Field
              label="Email"
              error="Please enter a valid email."
              labelFor="project-email"
            >
              <Input
                id="project-email"
                type="email"
                placeholder="you@aigfonline.com"
                invalid
                fullWidth
              />
            </Field>
            <Field label="Access">
              <RadioGroup
                name="audience"
                value={audience}
                onChange={setAudience}
                options={[
                  { label: 'Founders', value: 'founders' },
                  { label: 'Writers', value: 'writers' },
                  { label: 'Teams', value: 'teams' },
                ]}
              />
            </Field>
          </FormRow>
          <div className={s.row}>
            <Checkbox label="Enable autosave" defaultChecked />
            <Switch label="Notify collaborators" />
          </div>
        </section>

        <section className={s.section} aria-label="File upload">
          <Typography variant="h3">File upload</Typography>
          <FileUpload
            label="Profile image"
            folder={FileDir.Public}
            value={uploadedFile}
            onChange={setUploadedFile}
          />
        </section>

        <section className={s.section} aria-label="Typography">
          <Typography variant="h3">Typography</Typography>
          <div className={s.stack}>
            <Typography variant="h1">The calm surface</Typography>
            <Typography variant="h2">Tools for focused writing</Typography>
            <Typography variant="h3">UI copy stays quiet</Typography>
            <Typography variant="body">
              UI body text uses Inter with a steady 15px / 1.5 rhythm.
            </Typography>
            <Typography variant="meta" tone="muted">
              Meta label, 13px, slightly tighter.
            </Typography>
            <Typography variant="prose" readingWidth>
              Inter carries long-form content as well, with a relaxed rhythm for
              dense text blocks.
            </Typography>
          </div>
        </section>

        <section className={s.section} aria-label="Layout">
          <Typography variant="h3">Layout</Typography>
          <Container size="narrow">
            <Section
              title="Section title"
              description="A short description that clarifies this block."
              actions={
                <Button size="sm" variant="secondary">
                  Action
                </Button>
              }
            >
              <Card>
                <Stack gap={12}>
                  <Typography variant="body">
                    Card content sits inside a section and container.
                  </Typography>
                  <Divider />
                  <Grid columns={2}>
                    <Typography variant="meta" tone="muted">
                      Left column
                    </Typography>
                    <Typography variant="meta" tone="muted">
                      Right column
                    </Typography>
                  </Grid>
                </Stack>
              </Card>
            </Section>
          </Container>
        </section>

        <section className={s.section} aria-label="Feedback">
          <Typography variant="h3">Feedback</Typography>
          <div className={s.stack}>
            <Alert
              title="Draft saved"
              description="Your note is safely stored in AIgf."
              tone="success"
            />
            <Alert
              title="Heads up"
              description="This workspace is nearing its storage limit."
              tone="warning"
            />
            <EmptyState
              title="No drafts yet"
              description="Start by writing a single sentence."
              action={<Button size="sm">New draft</Button>}
            />
            <div className={s.stack}>
              <Typography variant="meta" tone="muted">
                Progress
              </Typography>
              <Progress value={42} />
            </div>
            <div className={s.row}>
              <Skeleton width={120} height={14} />
              <Skeleton width={220} height={14} />
              <Skeleton width={64} height={64} circle />
            </div>
          </div>
        </section>

        <section className={s.section} aria-label="Data display">
          <Typography variant="h3">Data display</Typography>
          <div className={s.row}>
            <Badge>Accent</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning" outline>
              Warning
            </Badge>
            <Tag onRemove={() => null}>Prompt</Tag>
            <Tag tone="danger">Sensitive</Tag>
            <Avatar fallback="EB" />
            <Avatar size="lg" fallback="AIgf" />
          </div>
          <List
            items={[
              'Drafts stay clean and minimal.',
              'Focus modes remove the noise.',
              'Every note is searchable.',
            ]}
          />
          <Table
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'status', label: 'Status' },
              { key: 'updated', label: 'Updated' },
            ]}
            rows={[
              { title: 'Quiet morning', status: 'Draft', updated: '2m ago' },
              { title: 'Team note', status: 'Review', updated: '1h ago' },
              {
                title: 'Launch copy',
                status: 'Published',
                updated: 'Yesterday',
              },
            ]}
          />
        </section>

        <section className={s.section} aria-label="Navigation">
          <Typography variant="h3">Navigation</Typography>
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Library', href: '/library' },
              { label: 'Drafts' },
            ]}
          />
          <Tabs
            items={[
              { value: 'drafts', label: 'Drafts' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <Pagination page={page} totalPages={5} onChange={setPage} />
        </section>

        <section className={s.section} aria-label="Overlay">
          <Typography variant="h3">Overlay</Typography>
          <div className={s.row}>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Open modal
            </Button>
            <Popover
              trigger={<Button variant="ghost">Popover</Button>}
              content={
                <Typography variant="meta">
                  A small surface for quick context or actions.
                </Typography>
              }
            />
            <Dropdown
              trigger={<Button variant="outline">Menu: {menuValue}</Button>}
              items={[
                { label: 'Preview', value: 'Preview' },
                { label: 'Publish', value: 'Publish' },
                { label: 'Archive', value: 'Archive' },
              ]}
              onSelect={setMenuValue}
            />
          </div>
          <Modal
            open={isModalOpen}
            title="Publish draft?"
            onClose={() => setIsModalOpen(false)}
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setIsModalOpen(false)}>Publish</Button>
              </>
            }
          >
            <Typography variant="body">
              Once published, this draft becomes visible to your workspace.
            </Typography>
          </Modal>
        </section>
      </div>
    </AppShell>
  );
}
