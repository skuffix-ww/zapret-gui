import logoUrl from '../assets/logo.svg'

type Props = { className?: string; alt?: string }

export default function Logo({ className, alt = 'UnLimit' }: Props): JSX.Element {
  return <img src={logoUrl} className={className} alt={alt} draggable={false} />
}
