declare module "plyr" {
  export default class Plyr {
    constructor(target: string | Element, options?: Plyr.Options)

    source: Plyr.SourceInfo
    media: HTMLMediaElement
    elements: Plyr.Elements

    currentTime: number

    play(): Promise<void>
    pause(): void
    togglePlay(): Promise<void>
    stop(): void
    restart(): void
    rewind(seekTime: number): void
    forward(seekTime: number): void
    getCurrentTime(): number
    getDuration(): number
    getVolume(): number
    isMuted(): boolean
    isPaused(): boolean

    on(
      event: string,
      callback: (this: Plyr, event: Plyr.PlyrEvent) => void
    ): void
    once(
      event: string,
      callback: (this: Plyr, event: Plyr.PlyrEvent) => void
    ): void
    off(
      event: string,
      callback: (this: Plyr, event: Plyr.PlyrEvent) => void
    ): void

    destroy(): void

    // Add more methods and properties as needed
  }

  namespace Plyr {
    interface Options {
      provider?: string
      youtubeId?: string
      // Add more options as needed
    }

    interface SourceInfo {
      type: string
      sources: Array<{ src: string; type?: string }>
    }

    interface Elements {
      container: HTMLElement
      // Add more elements as needed
    }

    interface PlyrEvent extends Event {
      detail: {
        plyr: Plyr
      }
    }
  }
}
