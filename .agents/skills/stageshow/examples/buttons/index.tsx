import { Check, ChevronDown, Plus } from 'lucide-react'
import { Bar, Button, Stage, Window, type Act } from '../../kit'
import './buttons.css'

// A specimen sheet for Button: labels that change width with neighbors
// beside them, an icon that arrives later, every variant and size at rest,
// and a button in a row too narrow for it. A catalog, not a composition.

type S = { comment: string; resolve: string; resolved: boolean; icon: boolean }

const initial: S = { comment: 'Comment', resolve: 'Resolve', resolved: false, icon: false }
const POSTER: S = { comment: 'Posted', resolve: 'Resolved', resolved: true, icon: true }

async function script(a: Act<S>) {
  await a.wait(600)
  // Pressed beside the word, never on it
  await a.click({ at: 'comment', x: 0.82, y: 0.7 })
  await a.set({ comment: 'Posting…' })
  await a.wait(900)
  await a.set({ comment: 'Posted' })
  await a.wait(700)
  await a.click({ at: 'resolve', x: 0.84, y: 0.7 })
  await a.set({ resolve: 'Resolved', resolved: true })
  await a.wait(700)
  await a.click({ at: 'add', x: 0.84, y: 0.7 })
  await a.set({ icon: true })
  await a.wait(1400)
  await a.move('rest')
  await a.set(initial)
  await a.wait(1000)
}

export default function Buttons() {
  return (
    <Stage<S> specimen width={640} height={400} initial={initial} poster={POSTER} script={script} cursor={{ at: 'rest', style: 'arrow', ripple: true }} className="bn">
      {(s) => (
        <>
          <Window title="Buttons" className="bn-win">
            <div className="bn-body">
              <div className="bn-row">
                <Bar w={140} h={8} />
                <span className="bn-spacer" />
                <Button>Cancel</Button>
                <Button variant="primary" data-target="comment">{s.comment}</Button>
                <Button icon={<Check />} variant={s.resolved ? 'tertiary' : 'secondary'} data-target="resolve">{s.resolve}</Button>
              </div>
              <div className="bn-row">
                <Button variant="ghost" icon={s.icon ? <Plus /> : undefined} data-target="add">Add reviewer</Button>
                <Button trailingIcon={<ChevronDown />}>Sort</Button>
                <Button icon={<Plus />} trailingIcon={<ChevronDown />}>New</Button>
              </div>
              <div className="bn-row">
                <Button size="small">Small</Button>
                <Button>Medium</Button>
                <Button size="large">Large</Button>
                <Button variant="tertiary">Tertiary</Button>
                <Button variant="danger">Delete</Button>
              </div>
              <div className="bn-narrow">
                <span className="bn-long">A long title that wants the whole row</span>
                <Button icon={<Check />}>Resolve</Button>
              </div>
            </div>
          </Window>
          <span className="bn-rest" data-target="rest" />
        </>
      )}
    </Stage>
  )
}
