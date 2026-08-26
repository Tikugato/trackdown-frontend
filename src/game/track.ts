export type Titled = { title: string; artist?: string }

export function trackLabel(track: Titled): string {
  return track.artist ? `${track.artist} - ${track.title}` : track.title
}
