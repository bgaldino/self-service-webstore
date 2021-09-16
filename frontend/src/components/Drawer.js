import React from 'react';
import PropTypes from 'prop-types';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import List from '@material-ui/core/List';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import { HashRouter, Link, Route, Switch } from "react-router-dom";
import useToken from "./useToken";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
    },
    drawer: {
        [theme.breakpoints.up('sm')]: {
            width: drawerWidth,
            flexShrink: 0,
        },
    },
    appBar: {
        [theme.breakpoints.up('sm')]: {
            width: `calc(100% - ${drawerWidth}px)`,
            marginLeft: drawerWidth,
        },
    },
    menuButton: {
        marginRight: theme.spacing(2),
        [theme.breakpoints.up('sm')]: {
            display: 'none',
        },
    },
    // necessary for content to be below app bar
    toolbar: theme.mixins.toolbar,
    drawerPaper: {
        width: drawerWidth,
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing(3),
    },
}));

const BASE_URL = `${process.env.REACT_APP_API_ENDPOINT}/services/data/v${process.env.REACT_APP_API_VERSION}`;

function ResponsiveDrawer(props) {
    console.log('props', props);
    const { cartTotal, logout, window } = props;
    const classes = useStyles();
    const theme = useTheme();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const { token, setToken } = useToken();
    const [photoUrl, setPhotoUrl] = React.useState();
    const [userName, setUserName] = React.useState();
    const [company, setCompany] = React.useState();

    let requestHeaders = new Headers();
    requestHeaders.append("X-Requested-With", "XMLHttpRequest");
    requestHeaders.append("Authorization", "Bearer " + token);
    requestHeaders.append("Content-Type", "application/json");

    let requestOptions = {
        method: "GET",
        headers: requestHeaders,
        redirect: "follow",
    };

    fetch(
        `${BASE_URL}/sobjects/User/${localStorage.getItem('userid')}`,
        requestOptions
    )
        .then((response) => response.text())
        .then((result) => {
            const userData = JSON.parse(result);
            console.log('user data', userData);
            setPhotoUrl(userData.MediumPhotoUrl);
            const userName = (userData.FirstName || '') + ' ' + userData.LastName;
            setUserName(userName);
            localStorage.setItem('userName', userName);
            setCompany(userData.CompanyName || '');
        });


    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawer = (
        <div>
            <div className={classes.toolbar} class="center" style={{color: '#FFFFFF','line-height': '40px'}}>
                <h4>SmartBytes</h4>
                <img src="https://copa.s3.us-east-1.amazonaws.com/profile.png" height="120px" width="120px" class="user-icon"/>
                <div class="user-info">{userName}</div>
                <div class="user-info">{company}</div>
            </div>
            <Divider />
            <List>
                {[
                    {label: 'Store', url: '/'},
                    {label: 'What I Own', url: '/assets'},
                    {label: 'Trials', url: '/'},
                    {label: 'Cart (' + cartTotal + ')', url: '/cart'}
                ].map((item, index) => (
                    <Link to={item.url}>
                        {item.label}
                    </Link>
                ))}
            </List>
            <Divider style={{color: '#ffffff'}}/>
            <List>
                <Link to="/" onClick={logout}>
                    Log Out
                </Link>
            </List>
        </div>
    );

    const container = window !== undefined ? () => window().document.body : undefined;

    return (
        <div className={classes.root}>
            <nav className={classes.drawer} aria-label="mailbox folders">
                {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
                <Hidden smUp implementation="css">
                    <Drawer
                        container={container}
                        variant="temporary"
                        anchor={theme.direction === 'rtl' ? 'right' : 'left'}
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        classes={{
                            paper: classes.drawerPaper,
                        }}
                        ModalProps={{
                            keepMounted: true, // Better open performance on mobile.
                        }}
                    >
                        {drawer}
                    </Drawer>
                </Hidden>
                <Hidden xsDown implementation="css">
                    <Drawer
                        classes={{
                            paper: classes.drawerPaper,
                        }}
                        variant="permanent"
                        open
                    >
                        {drawer}
                    </Drawer>
                </Hidden>
            </nav>
        </div>
    );
}

ResponsiveDrawer.propTypes = {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    window: PropTypes.func,
};

export default ResponsiveDrawer;
