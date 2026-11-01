import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../auth/AuthContext'

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
const FONT_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]
const NOTE_COLORS = [
  { value: 'default', label: 'Default' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'pink', label: 'Pink' },
]

function RadioGroup({ legend, name, options, value, onChange }) {
  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} style={{ marginRight: '1rem' }}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />{' '}
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}

export default function PreferencesPage() {
  const { user, setUser } = useAuth()
  const [theme, setTheme] = useState(user.theme ?? 'light')
  const [fontSize, setFontSize] = useState(user.font_size ?? 'medium')
  const [noteColor, setNoteColor] = useState(user.note_color ?? 'default')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setMessage('')
    setSubmitting(true)
    try {
      const res = await api.put('/preferences', {
        theme,
        font_size: fontSize,
        note_color: noteColor,
      })
      setUser(res.data)
      setMessage('Preferences saved.')
    } catch (err) {
      setErrors(
        err.response?.data?.errors || {
          general: ['Something went wrong. Please try again.'],
        }
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1rem' }}>
      <h1>Preferences</h1>
      <form onSubmit={handleSubmit}>
        <RadioGroup
          legend="Theme"
          name="theme"
          options={THEMES}
          value={theme}
          onChange={setTheme}
        />
        {errors.theme && <p role="alert">{errors.theme[0]}</p>}

        <RadioGroup
          legend="Note font size"
          name="font_size"
          options={FONT_SIZES}
          value={fontSize}
          onChange={setFontSize}
        />
        {errors.font_size && <p role="alert">{errors.font_size[0]}</p>}

        <RadioGroup
          legend="Note color"
          name="note_color"
          options={NOTE_COLORS}
          value={noteColor}
          onChange={setNoteColor}
        />
        {errors.note_color && <p role="alert">{errors.note_color[0]}</p>}

        <div
          data-font-size={fontSize}
          data-note-color={noteColor}
          style={{
            background: 'var(--note-bg)',
            color: 'var(--note-text)',
            fontSize: 'var(--note-font-size)',
            border: '1px solid var(--app-border)',
            borderRadius: 8,
            padding: '1rem',
            margin: '1rem 0',
          }}
        >
          <strong>Sample note</strong>
          <p>This is how your notes will look.</p>
        </div>

        {errors.general && <p role="alert">{errors.general[0]}</p>}
        {message && <p role="status">{message}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save preferences'}
        </button>
      </form>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </main>
  )
}