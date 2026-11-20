import { Check, MessageSquare } from 'lucide-react'
import { Avatar, Bar, Button, Card, Divider, Field, Kbd, Stage, type Act } from '../../kit'
import './cards.css'

// A specimen sheet for Card, Divider and Kbd: a comment card whose padding
// is one value on every side, a flush card split into sections, a sunken group inside it with a radius taken
// from the card's, a toolbar split by a vertical rule, and shortcuts beside
// actions. A catalog, not a composition.

type S = { resolved: boolean }

const initial: S = { resolved: false }

async function script(a: Act<S>) {
  await a.wait(800)
  await a.click({ at: 'resolve', x: 0.84, y: 0.7 })
  await a.set({ resolved: true })
  await a.wait(1600)
  await a.move('rest')
  await a.set(initial)
  await a.wait(1000)
}

export default function Cards() {
  return (
    <Stage<S> specimen width={640} height={400} initial={initial} poster={{ resolved: true }} script={script} cursor={{ at: 'rest', style: 'arrow', ripple: true }} className="cd">
      {(s) => (
        <>
          <div className="cd-grid">
            <Card className="cd-comment">
              <div className="cd-head">
                <Avatar name="Mara Lind" size={24} />
                <span className="cd-who">Mara Lind</span>
                <span className="cd-when">2m</span>
              </div>
              <p className="cd-text">Retry should back off, not hammer the endpoint. Can we cap it at three?</p>
              <Card tone="sunken" pad="small" gap={6} className="cd-quote">
                <Bar w="80%" h={6} tone={3} />
                <Bar w="56%" h={6} tone={3} />
              </Card>
              <Divider />
              <div className="cd-actions">
                <Button size="small" variant="ghost" icon={<MessageSquare />}>Reply</Button>
                <span className="cd-spacer" />
                <Button size="small" icon={<Check />} variant={s.resolved ? 'tertiary' : 'secondary'} data-target="resolve">{s.resolved ? 'Resolved' : 'Resolve'}</Button>
              </div>
            </Card>
            <div className="cd-side">
              <Card pad="small" flush>
                <Field value="" placeholder="Search" trailing={<Kbd keys={['⌘', 'K']} />} />
                <div className="cd-toolbar">
                  <Button size="small" variant="ghost">Bold</Button>
                  <Button size="small" variant="ghost">Italic</Button>
                  <Divider vertical />
                  <Button size="small" variant="ghost">Link</Button>
                </div>
              </Card>
              <Card pad="large" lift gap={8}>
                <div className="cd-menu-row"><span>New file</span><Kbd plain keys={['⌘', 'N']} /></div>
                <div className="cd-menu-row"><span>Save</span><Kbd plain keys={['⌘', 'S']} /></div>
                <Divider />
                <div className="cd-menu-row"><span>Close</span><Kbd plain keys={['⌘', 'W']} /></div>
              </Card>
            </div>
          </div>
          <span className="cd-rest" data-target="rest" />
        </>
      )}
    </Stage>
  )
}
