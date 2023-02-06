function Member(props) {
    return (
        <div>
            <b>{props.name}</b>
            <br/>
            <p>{props.bio}</p>
        </div>
    );
}

export default Member;