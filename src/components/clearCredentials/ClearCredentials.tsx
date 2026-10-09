import './ClearCredentials.scss'

type ClearCredentialsProps = {
  onClear: () => void
}

export function ClearCredentials({ onClear }: ClearCredentialsProps) {
  return (
    <button className="clear-credentials" type="button" onClick={onClear}>
      Выйти
    </button>
  )
}
