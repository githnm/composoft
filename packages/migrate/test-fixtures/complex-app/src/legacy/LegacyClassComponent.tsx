import { Component } from "react";

type Props = { id: string };
type State = { count: number };

// Class component — analyzer should skip + add to limitations[].
export class LegacyClassComponent extends Component<Props, State> {
  state: State = { count: 0 };
  override render() {
    return (
      <div>
        Item {this.props.id}: {this.state.count}
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>+</button>
      </div>
    );
  }
}
