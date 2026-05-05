import { Component } from "react";

export class AnotherClass extends Component<{ name: string }> {
  override render() {
    return <span>{this.props.name}</span>;
  }
}
