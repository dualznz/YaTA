import { ButtonGroup, Classes, Colors, Icon, IconName, IPanel, IPanelProps, Text } from '@blueprintjs/core'
import * as _ from 'lodash'
import * as React from 'react'
import TimeAgo from 'react-timeago'
import styled from 'styled-components'

import { ChannelDetailsProps } from 'Components/ChannelDetails'
import ChannelDetailsDescription from 'Components/ChannelDetailsDescription'
import ChannelDetailsPanel from 'Components/ChannelDetailsPanel'
import ChannelDetailsPanelButton from 'Components/ChannelDetailsPanelButton'
import ChannelDetailsVideos from 'Components/ChannelDetailsVideos'
import NonIdealState from 'Components/NonIdealState'
import Spinner from 'Components/Spinner'
import Twitch, { RawRelationship, RawStream } from 'Libs/Twitch'
import { color } from 'Utils/styled'

/**
 * Detail component.
 */
const Detail = styled(Text).attrs({
  ellipsize: true,
})`
  margin: 4px 0;

  &:first-of-type {
    margin-top: 0;
  }
`

/**
 * Title component.
 */
const Title = styled(Detail)`
  color: ${Colors.BLUE5};
  font-size: 0.96rem;
  font-weight: bold;
`

/**
 * Game component.
 */
const Game = styled(Detail)`
  font-size: 0.88rem;
`

/**
 * Meta component.
 */
const Meta = styled(Detail)`
  color: ${color('follow.meta')};
  font-size: 0.82rem;
`

/**
 * PreviewWrapper component.
 */
const PreviewWrapper = styled.div`
  cursor: pointer;
  margin-top: 10px;
  position: relative;
`

/**
 * PlayIcon component.
 */
const PlayIcon = styled(Icon)`
  filter: drop-shadow(1px 1px 0 ${Colors.DARK_GRAY5});
  height: 100px;
  left: calc(50% - 50px);
  pointer-events: none;
  position: absolute;
  top: calc(50% - 50px);
  width: 100px;
`

/**
 * Preview component.
 */
const Preview = styled.img`
  border: 1px solid ${Colors.DARK_GRAY3};
  display: block;
  max-width: 100%;
`

/**
 * PanelButtons component.
 */
const PanelButtons = styled.div`
  border-top: 1px solid ${color('channel.border')};
  padding: 0;

  & .${Classes.BUTTON_GROUP}.${Classes.MINIMAL}.${Classes.FILL} {
    background-color: ${color('channel.background')};
  }
`

/**
 * The various panel types.
 */
export enum ChannelDetailsType {
  Description = 'Description',
  LastVods = 'Last Vods',
  RecentClips = 'Recent Clips',
  TopClips = 'Top Clips',
}

/**
 * A map between panel types & their associated components.
 */
const ChannelDetailsPanels = {
  [ChannelDetailsType.Description]: { component: ChannelDetailsDescription, icon: 'info-sign' },
  [ChannelDetailsType.LastVods]: { component: ChannelDetailsVideos, icon: 'video' },
  [ChannelDetailsType.RecentClips]: { component: ChannelDetailsVideos, icon: 'film' },
  [ChannelDetailsType.TopClips]: { component: ChannelDetailsVideos, icon: 'crown' },
} as { [key in ChannelDetailsType]: ChannelDetailsPanel }

/**
 * React State.
 */
const initialState = {
  didFail: false,
  relationship: undefined as RawRelationship | null | undefined,
  stream: undefined as RawStream | null | undefined,
}
type State = Readonly<typeof initialState>

/**
 * ChannelDetailsOverview Component.
 */
export default class ChannelDetailsOverview extends React.Component<IPanelProps & ChannelDetailsProps, State> {
  public state: State = initialState

  /**
   * Lifecycle: componentDidMount.
   */
  public async componentDidMount() {
    const { id } = this.props

    if (!_.isNil(id)) {
      try {
        const response = await Promise.all([Twitch.fetchStream(id), Twitch.fetchRelationship(id)])

        this.setState(() => ({ didFail: false, stream: response[0].stream, relationship: response[1] }))
      } catch (error) {
        this.setState(() => ({ didFail: true }))
      }
    } else {
      this.setState(() => ({ didFail: true }))
    }
  }

  /**
   * Renders the component.
   * @return Element to render.
   */
  public render() {
    const { didFail, stream } = this.state

    if (didFail) {
      return <NonIdealState small title="Something went wrong!" details="Please try again in a few minutes." />
    }

    if (_.isUndefined(stream)) {
      return <Spinner />
    }

    return (
      <>
        <ChannelDetailsPanel>{this.renderStream()}</ChannelDetailsPanel>
        <PanelButtons>
          <ButtonGroup fill minimal large>
            {_.map(ChannelDetailsType, (type) => (
              <ChannelDetailsPanelButton
                panel={ChannelDetailsPanels[type]}
                onClick={this.showPanel}
                type={type}
                key={type}
              />
            ))}
          </ButtonGroup>
        </PanelButtons>
      </>
    )
  }

  /**
   * Renders the stream details.
   * @return Element to render.
   */
  private renderStream() {
    const { channel } = this.props
    const { relationship, stream } = this.state

    if (_.isNil(stream) || _.isNil(channel)) {
      return <NonIdealState small title="Currently offline!" />
    }

    return (
      <>
        <Title>
          <a href={stream.channel.url} target="_blank">
            {stream.channel.status}
          </a>
        </Title>
        <Game>{stream.channel.game}</Game>
        <Meta>{stream.viewers.toLocaleString()} viewers</Meta>
        <Meta>
          Started <TimeAgo date={new Date(stream.created_at)} />.
        </Meta>
        <Meta>
          {_.isNil(relationship)
            ? 'Channel not followed.'
            : `Followed since ${new Date(relationship.followed_at).toLocaleDateString()}.`}
        </Meta>
        <PreviewWrapper>
          <Preview src={stream.preview.medium} onClick={this.onClickPreview} />
          <PlayIcon icon="play" />
        </PreviewWrapper>
      </>
    )
  }

  /**
   * Shows a specific panel.
   * @param type - The panel type.
   */
  private showPanel = (type: ChannelDetailsType) => {
    const { channel, id } = this.props

    const panel: IPanel<any> = {
      component: ChannelDetailsPanels[type].component,
      props: { channel, id, type },
      title: type,
    }

    this.props.openPanel(panel)
  }

  /**
   * Triggered when a preview is clicked.
   */
  private onClickPreview = () => {
    window.open(
      `https://player.twitch.tv/?muted&channel=${this.props.channel}`,
      'videoPopupWindow',
      'height=360,width=600'
    )
  }
}

/**
 * Channel details panel.
 */
export type ChannelDetailsPanel = { component: React.ComponentType<any>; icon: IconName }
