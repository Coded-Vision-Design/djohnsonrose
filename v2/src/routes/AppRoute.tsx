import { useParams } from 'react-router-dom'
import { Shell } from '../shell/Shell'

export default function AppRoute() {
  const { name } = useParams<{ name: string }>()
  return <Shell initialApp={name} />
}
